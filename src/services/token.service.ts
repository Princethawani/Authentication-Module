import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { getRedis } from '../config/redis';
import { env, REFRESH_EXPIRY_DAYS } from '../config/env';
import { RefreshToken } from '../entities/RefreshToken';
import { TokenBlacklist } from '../entities/TokenBlacklist';
import { UserRole } from '../entities/UserRole';
import { JwtPayload } from '../types';

const BLACKLIST_PREFIX = 'blacklist:';

export class TokenService {
  private refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
  private blacklistRepo = AppDataSource.getRepository(TokenBlacklist);
  private userRoleRepo = AppDataSource.getRepository(UserRole);

  // ── Access Token ────────────────────────────────────────────────────────────

  generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'] }
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  async generateRefreshToken(
    userId: string,
    ipAddress?: string,
    deviceInfo?: string
  ): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

    const refreshToken = this.refreshTokenRepo.create({
      token,
      userId,
      expiresAt,
      ipAddress,
      deviceInfo,
    });

    await this.refreshTokenRepo.save(refreshToken);
    return token;
  }

  async rotateRefreshToken(
    oldToken: string,
    ipAddress?: string,
    deviceInfo?: string
  ): Promise<{ userId: string; roles: string[]; newRefreshToken: string } | null> {
    const existing = await this.refreshTokenRepo.findOne({
      where: { token: oldToken },
    });

    // Token not found or already revoked or expired — possible replay attack
    if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
      // If token exists but was already revoked — revoke ALL sessions for this user
      // This handles replay attacks — someone is reusing a stolen token
      if (existing?.isRevoked) {
        await this.revokeAllUserTokens(existing.userId);
      }
      return null;
    }

    // Revoke the old token
    existing.isRevoked = true;
    existing.revokedAt = new Date();
    await this.refreshTokenRepo.save(existing);

    // Get user roles
    const userRoles = await this.userRoleRepo.find({
      where: { userId: existing.userId },
      relations: ['role'],
    });
    const roles = userRoles.map((ur) => ur.role.name);

    // Issue new refresh token
    const newRefreshToken = await this.generateRefreshToken(
      existing.userId,
      ipAddress,
      deviceInfo
    );

    return { userId: existing.userId, roles, newRefreshToken };
  }

  // ── Blacklist ───────────────────────────────────────────────────────────────

  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    const redis = getRedis();
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    if (ttlSeconds > 0) {
      // Store in Redis — auto-expires, O(1) lookup
      await redis.setex(`${BLACKLIST_PREFIX}${token}`, ttlSeconds, '1');
    }

    // Also store in DB as fallback in case Redis restarts
    const blacklisted = this.blacklistRepo.create({ token, expiresAt });
    await this.blacklistRepo.save(blacklisted).catch(() => {
      // Ignore duplicate errors — token may already be blacklisted
    });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const redis = getRedis();

    // Check Redis first — fastest path
    const inRedis = await redis.exists(`${BLACKLIST_PREFIX}${token}`);
    if (inRedis === 1) return true;

    // Fallback to DB if Redis missed (e.g. after restart)
    const inDb = await this.blacklistRepo.findOne({
      where: { token },
    });

    return !!inDb && inDb.expiresAt > new Date();
  }

  // ── Session Management ──────────────────────────────────────────────────────

  async getActiveSessions(userId: string) {
    return this.refreshTokenRepo.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
      select: ['id', 'deviceInfo', 'ipAddress', 'createdAt', 'expiresAt'],
    });
  }

  async revokeSession(tokenId: string, userId: string): Promise<boolean> {
    const token = await this.refreshTokenRepo.findOne({
      where: { id: tokenId, userId, isRevoked: false },
    });

    if (!token) return false;

    token.isRevoked = true;
    token.revokedAt = new Date();
    await this.refreshTokenRepo.save(token);
    return true;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where('userId = :userId AND isRevoked = false', { userId })
      .execute();
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();

    // Delete expired refresh tokens
    const refreshResult = await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expiresAt < :now OR isRevoked = true', { now })
      .execute();

    // Delete expired blacklist entries
    await this.blacklistRepo
      .createQueryBuilder()
      .delete()
      .from(TokenBlacklist)
      .where('expiresAt < :now', { now })
      .execute();

    return refreshResult.affected ?? 0;
  }
}