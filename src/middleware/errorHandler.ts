import { Request, Response, NextFunction } from 'express';

// ── Error Map ─────────────────────────────────────────────────────────────────
// Maps service-level error codes to HTTP status + human readable message

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  // Auth
  EMAIL_EXISTS:          { status: 409, message: 'An account with this email already exists' },
  INVALID_CREDENTIALS:   { status: 401, message: 'Invalid email or password' },
  ACCOUNT_LOCKED:        { status: 423, message: 'Account temporarily locked due to too many failed login attempts' },
  EMAIL_NOT_VERIFIED:    { status: 403, message: 'Please verify your email address before logging in' },
  INVALID_REFRESH_TOKEN: { status: 401, message: 'Invalid or expired refresh token' },
  INVALID_TOKEN:         { status: 400, message: 'Invalid or expired token' },
  TOKEN_EXPIRED:         { status: 400, message: 'Token has expired. Please request a new one' },

  // User
  USER_NOT_FOUND:        { status: 404, message: 'User not found' },
  ROLE_NOT_FOUND:        { status: 404, message: 'Role not found' },
  ROLE_ALREADY_ASSIGNED: { status: 409, message: 'User already has this role' },

  // Email config
  EMAIL_CONFIG_NOT_FOUND: { status: 404, message: 'Email config not found' },
  APP_ID_EXISTS:          { status: 409, message: 'An email config with this App ID already exists' },

  // 2FA
  TWO_FACTOR_NOT_SETUP:    { status: 400, message: '2FA has not been set up for this account' },
  TWO_FACTOR_NOT_ENABLED:  { status: 400, message: '2FA is not enabled for this account' },
  INVALID_TOTP_CODE:       { status: 401, message: 'Invalid or expired authentication code' },
};

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must have 4 parameters for Express to treat it as an error handler

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction  // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  // Known service error — map to HTTP response
  const mapped = ERROR_MAP[err.message];

  if (mapped) {
    res.status(mapped.status).json({
      error: err.message,
      message: mapped.message,
    });
    return;
  }

  // Unknown error — log it and return generic 500
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

// ── Validation Error Handler ──────────────────────────────────────────────────
// Call this inside controllers when Zod validation fails

export function validationError(res: Response, details: unknown): void {
  res.status(400).json({
    error: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    details,
  });
}