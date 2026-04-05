import { Router, RequestHandler } from 'express';
import { TotpController } from '../controllers/totp.controller';
import { TotpService } from '../services/totp.service';
import { authenticate } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

// ── Rate Limiter ──────────────────────────────────────────────────────────────
// Strict limit on validate — prevents brute forcing 2FA codes

const validateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many 2FA attempts. Please try again in 15 minutes',
  },
});

// ── Wire up service and controller ────────────────────────────────────────────

const totpService = new TotpService();
const totpController = new TotpController(totpService);

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// All 2FA routes require authentication
router.use(authenticate as unknown as RequestHandler);

router.get('/status',    totpController.getStatus   as unknown as RequestHandler);
router.post('/setup',    totpController.setup        as unknown as RequestHandler);
router.post('/enable',   totpController.enable       as unknown as RequestHandler);
router.post('/disable',  totpController.disable      as unknown as RequestHandler);
router.post('/validate', validateLimiter, totpController.validate as unknown as RequestHandler);

export default router;