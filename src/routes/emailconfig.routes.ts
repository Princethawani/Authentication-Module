import { Router } from 'express';
import { EmailConfigController } from '../controllers/emailconfig.controller';
import { EmailConfigService } from '../services/emailconfig.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

// ── Wire up service and controller ────────────────────────────────────────────

const emailConfigService = new EmailConfigService();
const emailConfigController = new EmailConfigController(emailConfigService);

// ── Router ────────────────────────────────────────────────────────────────────
// All email config routes are Admin only

const router = Router();

router.use(authenticate, requireRole('Admin'));

router.get(
  '/',
  emailConfigController.list
);

router.get(
  '/:id',
  emailConfigController.findById
);

router.post(
  '/',
  emailConfigController.create
);

router.put(
  '/:id',
  emailConfigController.update
);

router.delete(
  '/:id',
  emailConfigController.delete
);

router.post(
  '/:id/toggle',
  emailConfigController.toggle
);

export default router;