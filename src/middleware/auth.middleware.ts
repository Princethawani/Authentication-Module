import { Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { AuthRequest } from '../types';

const tokenService = new TokenService();

// ── Authenticate ──────────────────────────────────────────────────────────────
// Verifies the JWT access token and attaches user to the request

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // strip 'Bearer '

    // Verify signature and expiry
    const payload = tokenService.verifyAccessToken(token);

    if (payload.type !== 'access') {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid token type',
      });
      return;
    }

    // Check if token has been blacklisted (logged out)
    const isBlacklisted = await tokenService.isTokenBlacklisted(token);

    if (isBlacklisted) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Token has been revoked',
      });
      return;
    }

    // Attach user to request for use in controllers
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };

    // Extract X-App-ID header for multi-app email support
    req.appId = (req.headers['x-app-id'] as string) || 'default';

    next();
  } catch (err) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
}

// ── Require Role ──────────────────────────────────────────────────────────────
// Use after authenticate — checks the user has at least one of the given roles

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access restricted. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

// ── Extract App ID ────────────────────────────────────────────────────────────
// Lightweight middleware — pulls X-App-ID from header on public routes
// (register, forgot-password etc.) that don't need authentication

export function extractAppId(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  req.appId = (req.headers['x-app-id'] as string) || 'default';
  next();
}