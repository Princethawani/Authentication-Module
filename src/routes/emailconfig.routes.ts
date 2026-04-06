import { Router, RequestHandler } from 'express';
import { EmailConfigController } from '../controllers/emailconfig.controller';
import { EmailConfigService } from '../services/emailconfig.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

// ── Wire up service and controller ────────────────────────────────────────────

const emailConfigService = new EmailConfigService();
const emailConfigController = new EmailConfigController(emailConfigService);

// ── Middleware casts ──────────────────────────────────────────────────────────

const auth = authenticate as unknown as RequestHandler;
const adminOnly = requireRole('Admin') as unknown as RequestHandler;

// ── Router ────────────────────────────────────────────────────────────────────
// All email config routes are Admin only

const router = Router();

router.use(auth, adminOnly);

router.get('/',
  emailConfigController.list as unknown as RequestHandler
);

router.get('/:id',
  emailConfigController.findById as unknown as RequestHandler
);

router.post('/',
  emailConfigController.create as unknown as RequestHandler
);

router.put('/:id',
  emailConfigController.update as unknown as RequestHandler
);

router.delete('/:id',
  emailConfigController.delete as unknown as RequestHandler
);

router.post('/:id/toggle',
  emailConfigController.toggle as unknown as RequestHandler
);

export default router;