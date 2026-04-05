import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { AuthRequest } from '../types';
import { validationError } from '../middleware/errorHandler';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
  AssignRoleSchema,
} from '../types/schemas';

// Instantiate services here
const tokenService = new TokenService();
const emailService = new EmailService();
const authService = new AuthService(tokenService, emailService);
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── Health ────────────────────────────────────────────────────────────────────

  health = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    });
  };

  // ── Register ──────────────────────────────────────────────────────────────────

  register = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = RegisterSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const response = await this.authService.register(
        result.data,
        req.appId
      );
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────────

  login = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = LoginSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const response = await this.authService.login(
        result.data,
        req.ip,
        req.headers['user-agent']
      );
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  // ── Refresh ───────────────────────────────────────────────────────────────────

  refresh = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = RefreshTokenSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const response = await this.authService.refresh(
        result.data.refreshToken,
        req.ip,
        req.headers['user-agent']
      );
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────────

  logout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = req.headers.authorization!.substring(7);
      await this.authService.logout(token, req.user!.id, req.ip);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ── Verify Email ──────────────────────────────────────────────────────────────

  verifyEmail = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { token } = req.query as { token?: string };

    if (!token) {
      res.status(400).json({
        error: 'MISSING_TOKEN',
        message: 'Verification token is required',
      });
      return;
    }

    try {
      await this.authService.verifyEmail(token);
      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ── Forgot Password ───────────────────────────────────────────────────────────

  forgotPassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = ForgotPasswordSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      await this.authService.forgotPassword(result.data, req.appId);
      // Always return the same message — never reveal if email exists
      res.json({
        message: 'If an account exists with that email, a reset link has been sent',
      });
    } catch (err) {
      next(err);
    }
  };

  // ── Reset Password ────────────────────────────────────────────────────────────

  resetPassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = ResetPasswordSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      await this.authService.resetPassword(result.data);
      res.json({ message: 'Password reset successfully. Please log in again.' });
    } catch (err) {
      next(err);
    }
  };

  // ── Profile ───────────────────────────────────────────────────────────────────

  getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = await this.authService.getProfile(req.user!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = UpdateProfileSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const profile = await this.authService.updateProfile(
        req.user!.id,
        result.data
      );
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  // ── Activity ──────────────────────────────────────────────────────────────────

  getActivity = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const activity = await this.authService.getUserActivity(req.user!.id);
      res.json(activity);
    } catch (err) {
      next(err);
    }
  };

  // ── Sessions ──────────────────────────────────────────────────────────────────

  getSessions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tokenService = new TokenService();
      const sessions = await tokenService.getActiveSessions(req.user!.id);
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  };

  revokeSession = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { tokenId } = req.params;

    try {
      const tokenService = new TokenService();
      const revoked = await tokenService.revokeSession(tokenId, req.user!.id);

      if (!revoked) {
        res.status(404).json({
          error: 'SESSION_NOT_FOUND',
          message: 'Session not found or already revoked',
        });
        return;
      }

      res.json({ message: 'Session revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ── Admin ─────────────────────────────────────────────────────────────────────

  listUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.authService.listUsers(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  assignRole = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = AssignRoleSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      await this.authService.assignRole(result.data);
      res.json({ message: 'Role assigned successfully' });
    } catch (err) {
      next(err);
    }
  };

  removeRole = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = AssignRoleSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      await this.authService.removeRole(result.data);
      res.json({ message: 'Role removed successfully' });
    } catch (err) {
      next(err);
    }
  };
}