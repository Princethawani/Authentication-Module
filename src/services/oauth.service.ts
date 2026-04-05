import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { OAuthAccount, OAuthProvider } from '../entities/OAuthAccount';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';
import { TokenService } from './token.service';
import { AuthTokens } from '../types';

interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export class OAuthService {
  private userRepo = AppDataSource.getRepository(User);
  private roleRepo = AppDataSource.getRepository(Role);
  private userRoleRepo = AppDataSource.getRepository(UserRole);
  private oauthRepo = AppDataSource.getRepository(OAuthAccount);
  private tokenService = new TokenService();

  async handleOAuthLogin(
    profile: OAuthProfile,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens & { isNewUser: boolean }> {

    // ── Step 1: Check if this OAuth account already exists ────────────────────
    let oauthAccount = await this.oauthRepo.findOne({
      where: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    let user: User;
    let isNewUser = false;

    if (oauthAccount) {
      // ── Existing OAuth account — find the linked user ─────────────────────
      const existingUser = await this.userRepo.findOne({
        where: { id: oauthAccount.userId },
      });

      if (!existingUser || !existingUser.isActive) {
        throw new Error('USER_NOT_FOUND');
      }

      user = existingUser;

      // Update tokens in case they changed
      oauthAccount.accessToken = profile.accessToken;
      oauthAccount.refreshToken = profile.refreshToken;
      await this.oauthRepo.save(oauthAccount);

    } else {
      // ── No existing OAuth account ─────────────────────────────────────────

      // Check if a user with this email already exists
      const existingUser = profile.email
        ? await this.userRepo.findOne({ where: { email: profile.email } })
        : null;

      if (existingUser) {
        // ── Link OAuth account to existing user ───────────────────────────
        user = existingUser;
      } else {
        // ── Create brand new user ─────────────────────────────────────────
        isNewUser = true;

        const newUser = this.userRepo.create({
          email: profile.email ?? `${profile.provider}_${profile.providerAccountId}@oauth.local`,
          passwordHash: crypto.randomBytes(32).toString('hex'), // unusable password
          firstName: profile.firstName ?? profile.displayName ?? 'User',
          lastName: profile.lastName ?? '',
          isEmailVerified: !!profile.email, // trust OAuth email as verified
          isActive: true,
        });

        user = await this.userRepo.save(newUser);

        // Assign default User role
        const userRole = await this.roleRepo.findOne({ where: { name: 'User' } });
        if (userRole) {
          const assignment = this.userRoleRepo.create({
            userId: user.id,
            roleId: userRole.id,
          });
          await this.userRoleRepo.save(assignment);
        }
      }

      // Create the OAuth account link
      oauthAccount = this.oauthRepo.create({
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      });

      await this.oauthRepo.save(oauthAccount);
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // Get user roles
    const userRoles = await this.userRoleRepo.find({
      where: { userId: user.id },
      relations: ['role'],
    });
    const roles = userRoles.map((ur) => ur.role.name);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      isNewUser,
    };
  }

  async getLinkedAccounts(userId: string) {
    return this.oauthRepo.find({
      where: { userId },
      select: ['id', 'provider', 'email', 'displayName', 'avatarUrl', 'createdAt'],
    });
  }

  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    const account = await this.oauthRepo.findOne({
      where: { userId, provider },
    });

    if (!account) throw new Error('OAUTH_ACCOUNT_NOT_FOUND');

    // Make sure user has a password or another OAuth account before unlinking
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const otherAccounts = await this.oauthRepo.count({
      where: { userId },
    });

    // If this is their only login method, don't allow unlink
    if (otherAccounts <= 1 && user?.passwordHash.length === 64) {
      throw new Error('CANNOT_UNLINK_ONLY_LOGIN');
    }

    await this.oauthRepo.delete({ userId, provider });
  }
}