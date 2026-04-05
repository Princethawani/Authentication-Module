import nodemailer from 'nodemailer';
import { AppDataSource } from '../config/database';
import { AppEmailConfig } from '../entities/AppEmailConfig';
import { env } from '../config/env';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  appId?: string;
}

interface TransporterConfig {
  transporter: nodemailer.Transporter;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private emailConfigRepo = AppDataSource.getRepository(AppEmailConfig);

  // ── Transporter ─────────────────────────────────────────────────────────────

  private async getTransporter(appId?: string): Promise<TransporterConfig> {
    // Try to find a matching active config for this appId
    const config = await this.emailConfigRepo.findOne({
      where: {
        isActive: true,
        ...(appId ? { appId } : {}),
      },
      order: { createdAt: 'ASC' },
    });

    // No DB config found — fall back to env variables
    if (!config) {
      return {
        transporter: nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: parseInt(env.SMTP_PORT),
          secure: false,
          auth: {
            user: env.SMTP_USERNAME,
            pass: env.SMTP_PASSWORD,
          },
        }),
        fromEmail: env.DEFAULT_FROM_EMAIL,
        fromName: 'Auth Server',
      };
    }

    return {
      transporter: nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUsername,
          pass: config.smtpPassword,
        },
        tls: config.useTls ? { rejectUnauthorized: false } : undefined,
      }),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    };
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const { transporter, fromEmail, fromName } = await this.getTransporter(
        options.appId
      );

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      return true;
    } catch (err) {
      console.error('Email send failed:', err);
      return false;
    }
  }

  // ── Templates ───────────────────────────────────────────────────────────────

  async sendVerificationEmail(
    email: string,
    token: string,
    firstName: string,
    appId?: string
  ): Promise<boolean> {
    const url = `${env.APP_URL}/api/auth/verify-email?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      appId,
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 32px 24px;
          background: #ffffff;
        ">
          <h2 style="color: #1a1a2e; margin-bottom: 8px;">
            Hello, ${firstName}! 👋
          </h2>
          <p style="color: #444; line-height: 1.6;">
            Thanks for signing up. Please verify your email address
            to activate your account.
          </p>

          
            href="${url}"
            style="
              display: inline-block;
              background: #4f46e5;
              color: #ffffff;
              padding: 12px 28px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 24px 0;
            "
          >
            Verify Email Address
          </a>

          <p style="color: #888; font-size: 14px;">
            This link expires in <strong>24 hours</strong>.
            If you did not create an account you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Or paste this link into your browser:<br/>
            <a href="${url}" style="color: #4f46e5;">${url}</a>
          </p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string,
    appId?: string
  ): Promise<boolean> {
    const url = `${env.APP_URL}/reset-password?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Reset your password',
      appId,
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 32px 24px;
          background: #ffffff;
        ">
          <h2 style="color: #1a1a2e; margin-bottom: 8px;">
            Password Reset Request
          </h2>
          <p style="color: #444; line-height: 1.6;">
            Hi ${firstName}, we received a request to reset your password.
            Click the button below to choose a new one.
          </p>

          
            href="${url}"
            style="
              display: inline-block;
              background: #dc2626;
              color: #ffffff;
              padding: 12px 28px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 24px 0;
            "
          >
            Reset Password
          </a>

          <p style="color: #888; font-size: 14px;">
            This link expires in <strong>1 hour</strong>.
            If you did not request a password reset you can safely ignore this email.
            Your password will not change.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Or paste this link into your browser:<br/>
            <a href="${url}" style="color: #dc2626;">${url}</a>
          </p>
        </div>
      `,
    });
  }
}