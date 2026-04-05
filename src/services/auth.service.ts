import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';
import { ActivityLog } from '../entities/ActivityLog';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { env, BCRYPT_ROUNDS, MAX_FAILED_LOGINS, LOCKOUT_DURATION_MS } from '../config/env';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  AssignRoleDto,
} from '../types/schemas';
import {
  AuthResponse,
  AuthTokens,
  UserProfile,
  PaginatedResponse,
} from '../types';

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);
  private roleRepo = AppDataSource.getRepository(Role);
  private userRoleRepo = AppDataSource.getRepository(UserRole);
  private activityRepo = AppDataSource.getRepository(ActivityLog);

  constructor(
    private tokenService: TokenService,
    private emailService: EmailService
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo.find({
      where: { userId },
      relations: ['role'],
    });
    return userRoles.map((ur) => ur.role.name);
  }

  private async logActivity(
    userId: string,
    action: ActivityLog['action'],
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const log = this.activityRepo.create({
      userId,
      action,
      ipAddress,
      userAgent,
      metadata,
    });
    await this.activityRepo.save(log);
  }

  private toUserProfile(user: User, roles: string[]): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  // ── Register ─────────────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    appId?: string
  ): Promise<{ message: string }> {
    // Check if email already exists
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    );

    // Create user
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emailVerificationToken,
      emailVerificationExpiry,
    });

    await this.userRepo.save(user);

    // Assign default User role
    const userRole = await this.roleRepo.findOne({
      where: { name: 'User' },
    });

    if (userRole) {
      const assignment = this.userRoleRepo.create({
        userId: user.id,
        roleId: userRole.id,
      });
      await this.userRoleRepo.save(assignment);
    }

    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      emailVerificationToken,
      user.firstName,
      appId
    );

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    // Find user
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    // User not found or inactive
    // We throw the same error for both to prevent email enumeration
    if (!user || !user.isActive) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new Error('ACCOUNT_LOCKED');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;

      // Lock account if max attempts reached
      const lockoutUntil =
        failedAttempts >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCKOUT_DURATION_MS)
          : null;

      await this.userRepo.update(user.id, {
        failedLoginAttempts: failedAttempts,
        ...(lockoutUntil ? { lockoutUntil } : {}),
      });

      await this.logActivity(user.id, 'FAILED_LOGIN', ipAddress, userAgent, {
        attemptNumber: failedAttempts,
      });

      throw new Error('INVALID_CREDENTIALS');
    }

    // Check email verification
    if (!user.isEmailVerified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Get roles
    const roles = await this.getUserRoles(user.id);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      ipAddress,
      userAgent
    );

    // Reset failed attempts + update last login
    await this.userRepo.update(user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    });

    await this.logActivity(user.id, 'LOGIN', ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      user: this.toUserProfile(user, roles),
    };
  }

  // ── Refresh ──────────────────────────────────────────────────────────────────

  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const result = await this.tokenService.rotateRefreshToken(
      refreshToken,
      ipAddress,
      userAgent
    );

    if (!result) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Fetch fresh user data
    const user = await this.userRepo.findOne({
      where: { id: result.userId },
    });

    if (!user || !user.isActive) {
      throw new Error('USER_NOT_FOUND');
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: result.roles,
    });

    return {
      accessToken,
      refreshToken: result.newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(
    accessToken: string,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    // Blacklist the current access token
    try {
      const payload = this.tokenService.verifyAccessToken(accessToken);
      if (payload.exp) {
        await this.tokenService.blacklistToken(
          accessToken,
          new Date(payload.exp * 1000)
        );
      }
    } catch {
      // Token may already be expired — still proceed with logout
    }

    // Revoke all refresh tokens for this user
    await this.tokenService.revokeAllUserTokens(userId);

    await this.logActivity(userId, 'LOGOUT', ipAddress);
  }

  // ── Email Verification ────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error('INVALID_TOKEN');
    }

    if (
      user.emailVerificationExpiry &&
      user.emailVerificationExpiry < new Date()
    ) {
      throw new Error('TOKEN_EXPIRED');
    }

    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    });

    await this.logActivity(user.id, 'EMAIL_VERIFIED');
  }

  // ── Forgot Password ───────────────────────────────────────────────────────────

  async forgotPassword(
    dto: ForgotPasswordDto,
    appId?: string
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    // Always return silently — never reveal if email exists
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepo.update(user.id, {
      passwordResetToken: token,
      passwordResetExpiry: expiry,
    });

    await this.emailService.sendPasswordResetEmail(
      user.email,
      token,
      user.firstName,
      appId
    );
  }

  // ── Reset Password ────────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { passwordResetToken: dto.token },
    });

    if (!user) {
      throw new Error('INVALID_TOKEN');
    }

    if (
      user.passwordResetExpiry &&
      user.passwordResetExpiry < new Date()
    ) {
      throw new Error('TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.userRepo.update(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    // Revoke all sessions — force re-login everywhere after password change
    await this.tokenService.revokeAllUserTokens(user.id);

    await this.logActivity(user.id, 'PASSWORD_RESET');
  }

  // ── Profile ───────────────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) throw new Error('USER_NOT_FOUND');

    const roles = await this.getUserRoles(userId);
    return this.toUserProfile(user, roles);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto
  ): Promise<UserProfile> {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  // ── Activity ──────────────────────────────────────────────────────────────────

  async getUserActivity(userId: string) {
    return this.activityRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  async listUsers(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserProfile>> {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await this.getUserRoles(user.id);
        return this.toUserProfile(user, roles);
      })
    );

    return {
      data: usersWithRoles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async assignRole(dto: AssignRoleDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: dto.userId },
    });
    if (!user) throw new Error('USER_NOT_FOUND');

    const role = await this.roleRepo.findOne({
      where: { name: dto.roleName },
    });
    if (!role) throw new Error('ROLE_NOT_FOUND');

    // Check if already assigned
    const existing = await this.userRoleRepo.findOne({
      where: { userId: dto.userId, roleId: role.id },
    });
    if (existing) throw new Error('ROLE_ALREADY_ASSIGNED');

    const assignment = this.userRoleRepo.create({
      userId: dto.userId,
      roleId: role.id,
    });
    await this.userRoleRepo.save(assignment);
  }

  async removeRole(dto: AssignRoleDto): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { name: dto.roleName },
    });
    if (!role) throw new Error('ROLE_NOT_FOUND');

    await this.userRoleRepo.delete({
      userId: dto.userId,
      roleId: role.id,
    });
  }
}