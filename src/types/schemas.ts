import { z } from 'zod';

// ── Reusable password rule ────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

// ── Auth ──────────────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

// ── User ──────────────────────────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

// ── Admin ─────────────────────────────────────────────────────────────────────
export const AssignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleName: z.string().min(1, 'Role name is required'),
});

// ── Email Config ──────────────────────────────────────────────────────────────
export const EmailConfigSchema = z.object({
  appId: z.string().min(1).max(100),
  appName: z.string().min(1).max(200),
  fromEmail: z.string().email(),
  fromName: z.string().min(1).max(200),
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535).default(587),
  smtpUsername: z.string().min(1),
  smtpPassword: z.string().min(1),
  useTls: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const UpdateEmailConfigSchema = EmailConfigSchema
  .omit({ appId: true })
  .partial();

// ── Inferred Types (use these instead of writing interfaces manually) ──────────
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;
export type EmailConfigDto = z.infer<typeof EmailConfigSchema>;
export type UpdateEmailConfigDto = z.infer<typeof UpdateEmailConfigSchema>;