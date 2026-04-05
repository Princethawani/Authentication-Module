import { Router, RequestHandler } from 'express';
import {
  googleRedirect,
  googleCallback,
  githubRedirect,
  githubCallback,
  appleRedirect,     
  appleCallback,
  getLinkedAccounts,
  unlinkAccount,
} from '../controllers/oauth.controller';
import { authenticate } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many OAuth attempts. Please try again later',
  },
});

const router = Router();

// ── Google ────────────────────────────────────────────────────────────────────
router.get('/google', oauthLimiter, googleRedirect);
router.get('/google/callback', googleCallback);

// ── GitHub ────────────────────────────────────────────────────────────────────
router.get('/github', oauthLimiter, githubRedirect);
router.get('/github/callback', githubCallback);

// ── Apple ─────────────────────────────────────────────────────────────────────
// Apple uses POST for callback — not GET like Google/GitHub
router.get('/apple', oauthLimiter, appleRedirect);
router.post('/apple/callback', appleCallback);

// ── Linked Accounts (requires auth) ──────────────────────────────────────────
router.get('/linked', authenticate as unknown as RequestHandler, getLinkedAccounts as unknown as RequestHandler);
router.delete('/unlink/:provider', authenticate as unknown as RequestHandler, unlinkAccount as unknown as RequestHandler);

export default router;