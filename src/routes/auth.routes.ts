import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { authenticate, requireRole, extractAppId } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

// ── Rate Limiters ─────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per hour per IP
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many registration attempts. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,                    // 3 reset attempts per hour
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many password reset attempts. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Wire up services and controller ──────────────────────────────────────────

const tokenService = new TokenService();
const emailService = new EmailService();
const authService = new AuthService(tokenService, emailService);
const authController = new AuthController(authService);

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// Public routes
router.get('/health', authController.health);

router.post(
  '/register',
  registerLimiter,
  extractAppId,
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  authController.login
);

router.post(
  '/refresh',
  authController.refresh
);

router.get(
  '/verify-email',
  authController.verifyEmail
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  extractAppId,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authController.resetPassword
);

// Protected routes — require valid JWT
router.post(
  '/logout',
  authenticate,
  authController.logout
);

router.get(
  '/profile',
  authenticate,
  authController.getProfile
);

router.put(
  '/profile',
  authenticate,
  authController.updateProfile
);

router.get(
  '/activity',
  authenticate,
  authController.getActivity
);

router.get(
  '/sessions',
  authenticate,
  authController.getSessions
);

router.post(
  '/revoke-session/:tokenId',
  authenticate,
  authController.revokeSession
);

// Admin only routes
router.get(
  '/users',
  authenticate,
  requireRole('Admin'),
  authController.listUsers
);

router.post(
  '/assign-role',
  authenticate,
  requireRole('Admin'),
  authController.assignRole
);

router.post(
  '/remove-role',
  authenticate,
  requireRole('Admin'),
  authController.removeRole
);

export default router;