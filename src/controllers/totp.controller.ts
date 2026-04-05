import { Response, NextFunction } from 'express';
import { TotpService } from '../services/totp.service';
import { AuthRequest } from '../types';
import { z } from 'zod';
import { validationError } from '../middleware/errorHandler';

const CodeSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters'),
});

export class TotpController {
  constructor(private totpService: TotpService) {}

  // GET /api/2fa/status
  getStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = await this.totpService.getStatus(req.user!.id);
      res.json(status);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/2fa/setup
  // Generates a secret and QR code — user scans this in their authenticator app
  setup = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.totpService.generateSetup(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/2fa/enable
  // User submits the code from their authenticator app to confirm setup
  enable = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = CodeSchema.safeParse(req.body);
    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const { backupCodes } = await this.totpService.verifyAndEnable(
        req.user!.id,
        result.data.code
      );

      res.json({
        message: '2FA enabled successfully. Save your backup codes — they will not be shown again.',
        backupCodes,
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/2fa/disable
  // User must provide a valid code to disable 2FA
  disable = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = CodeSchema.safeParse(req.body);
    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      await this.totpService.disable(req.user!.id, result.data.code);
      res.json({ message: '2FA disabled successfully' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/2fa/validate
  // Called during login when user has 2FA enabled
  // Client submits the 6-digit code after password check passes
  validate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = CodeSchema.safeParse(req.body);
    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const isValid = await this.totpService.validateCode(
        req.user!.id,
        result.data.code
      );

      if (!isValid) {
        res.status(401).json({
          error: 'INVALID_TOTP_CODE',
          message: 'Invalid or expired authentication code',
        });
        return;
      }

      res.json({ message: '2FA validated successfully' });
    } catch (err) {
      next(err);
    }
  };
}