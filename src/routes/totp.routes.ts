import { Router } from 'express';
import { TotpController } from '../controllers/totp.controller';
import { TotpService } from '../services/totp.service';
import { authenticate } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

// Strict rate limit on validate — prevents brute forcing 2FA codes
const validateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many 2FA attempts. Please try again in 15 minutes',
  },
});

const totpService = new TotpService();
const totpController = new TotpController(totpService);

const router = Router();

// All 2FA routes require authentication
router.use(authenticate);

router.get('/status',   totpController.getStatus);
router.post('/setup',   totpController.setup);
router.post('/enable',  totpController.enable);
router.post('/disable', totpController.disable);
router.post('/validate', validateLimiter, totpController.validate);

export default router;