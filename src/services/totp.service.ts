// eslint-disable-next-line @typescript-eslint/no-require-imports
const otplib = require('otplib');
const authenticator = otplib.authenticator ?? otplib.default?.authenticator ?? otplib;

import qrcode from 'qrcode';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { TwoFactorSecret } from '../entities/TwoFactorSecret';
import { User } from '../entities/User';

const BACKUP_CODE_COUNT = 8;

export class TotpService {
  private repo = AppDataSource.getRepository(TwoFactorSecret);
  private userRepo = AppDataSource.getRepository(User);

  // ── Generate Setup ──────────────────────────────────────────────────────────
  // Call this when user wants to enable 2FA
  // Returns the secret and a QR code data URL to show in the UI

  async generateSetup(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    manualEntryCode: string;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Build the otpauth URI — this is what QR code encodes
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      'AuthServer',
      secret
    );

    // Generate QR code as base64 data URL
    const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);

    // Save secret temporarily as unverified
    // isEnabled stays false until user verifies with a valid code
    const existing = await this.repo.findOne({ where: { userId } });

    if (existing) {
      existing.secret = secret;
      existing.isEnabled = false;
      await this.repo.save(existing);
    } else {
      const record = this.repo.create({
        userId,
        secret,
        isEnabled: false,
      });
      await this.repo.save(record);
    }

    return {
      secret,
      qrCodeUrl,
      manualEntryCode: secret,
    };
  }

  // ── Verify and Enable ───────────────────────────────────────────────────────
  // User scans QR code in their authenticator app and submits a code
  // We verify it and enable 2FA if correct

  async verifyAndEnable(
    userId: string,
    code: string
  ): Promise<{ backupCodes: string[] }> {
    const record = await this.repo.findOne({ where: { userId } });
    if (!record) throw new Error('TWO_FACTOR_NOT_SETUP');

    const isValid = authenticator.verify({
      token: code,
      secret: record.secret,
    });

    if (!isValid) throw new Error('INVALID_TOTP_CODE');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = backupCodes.map((c) => this.hashBackupCode(c));

    record.isEnabled = true;
    record.backupCodes = hashedCodes.join(',');
    await this.repo.save(record);

    // Return plain text backup codes — shown once, never again
    return { backupCodes };
  }

  // ── Validate Code on Login ──────────────────────────────────────────────────
  // Called during login flow when user has 2FA enabled

  async validateCode(userId: string, code: string): Promise<boolean> {
    const record = await this.repo.findOne({ where: { userId } });
    if (!record || !record.isEnabled) return false;

    // Check TOTP code first
    const isValidTotp = authenticator.verify({
      token: code,
      secret: record.secret,
    });

    if (isValidTotp) return true;

    // Check backup codes
    if (record.backupCodes) {
      const hashed = this.hashBackupCode(code);
      const codes = record.backupCodes.split(',');
      const index = codes.indexOf(hashed);

      if (index !== -1) {
        // Remove used backup code — each can only be used once
        codes.splice(index, 1);
        record.backupCodes = codes.length > 0 ? codes.join(',') : null;
        await this.repo.save(record);
        return true;
      }
    }

    return false;
  }

  // ── Disable ─────────────────────────────────────────────────────────────────

  async disable(userId: string, code: string): Promise<void> {
    const record = await this.repo.findOne({ where: { userId } });
    if (!record || !record.isEnabled) throw new Error('TWO_FACTOR_NOT_ENABLED');

    const isValid = await this.validateCode(userId, code);
    if (!isValid) throw new Error('INVALID_TOTP_CODE');

    await this.repo.delete({ userId });
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  async getStatus(userId: string): Promise<{ isEnabled: boolean }> {
    const record = await this.repo.findOne({ where: { userId } });
    return { isEnabled: record?.isEnabled ?? false };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}