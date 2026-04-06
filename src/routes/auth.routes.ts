import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { authenticate, requireRole, extractAppId } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

// ── Rate Limiters ─────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many registration attempts. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
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

// ── Middleware casts ──────────────────────────────────────────────────────────
// AuthRequest extends Express Request — cast needed for router compatibility

const auth = authenticate as unknown as RequestHandler;
const appId = extractAppId as unknown as RequestHandler;
const adminOnly = requireRole('Admin') as unknown as RequestHandler;

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

router.get('/health',
  authController.health as unknown as RequestHandler
);

router.post('/register',
  registerLimiter,
  appId,
  authController.register as unknown as RequestHandler
);

router.post('/login',
  loginLimiter,
  authController.login as unknown as RequestHandler
);

router.post('/refresh',
  authController.refresh as unknown as RequestHandler
);

router.get('/verify-email',
  authController.verifyEmail as unknown as RequestHandler
);

router.post('/forgot-password',
  forgotPasswordLimiter,
  appId,
  authController.forgotPassword as unknown as RequestHandler
);

router.post('/reset-password',
  authController.resetPassword as unknown as RequestHandler
);

// ── Protected routes — require valid JWT ──────────────────────────────────────

router.post('/logout',
  auth,
  authController.logout as unknown as RequestHandler
);

router.get('/profile',
  auth,
  authController.getProfile as unknown as RequestHandler
);

router.put('/profile',
  auth,
  authController.updateProfile as unknown as RequestHandler
);

router.get('/activity',
  auth,
  authController.getActivity as unknown as RequestHandler
);

router.get('/sessions',
  auth,
  authController.getSessions as unknown as RequestHandler
);

router.post('/revoke-session/:tokenId',
  auth,
  authController.revokeSession as unknown as RequestHandler
);

// ── Admin only routes ─────────────────────────────────────────────────────────

router.get('/users',
  auth,
  adminOnly,
  authController.listUsers as unknown as RequestHandler
);

router.post('/assign-role',
  auth,
  adminOnly,
  authController.assignRole as unknown as RequestHandler
);

router.post('/remove-role',
  auth,
  adminOnly,
  authController.removeRole as unknown as RequestHandler
);

export default router;