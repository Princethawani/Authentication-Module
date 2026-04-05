import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { env } from '../config/env';
import { OAuthService } from '../services/oauth.service';
import { TokenService } from '../services/token.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { OAuthProvider } from '../entities/OAuthAccount';

const oauthService = new OAuthService();
const tokenService = new TokenService();

// ── Redirect to Provider ──────────────────────────────────────────────────────
// These just kick off the OAuth flow by redirecting to the provider

export const googleRedirect = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

export const githubRedirect = passport.authenticate('github', {
  scope: ['user:email'],
  session: false,
});

// ── Callbacks ─────────────────────────────────────────────────────────────────
// Provider redirects back here after user approves

export const googleCallback = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate('google', { session: false }, (err: Error, tokens: any) => {
    if (err || !tokens) {
      return res.redirect(
        `${env.OAUTH_FAILURE_URL}?error=${encodeURIComponent(err?.message ?? 'oauth_failed')}`
      );
    }

    // Redirect to frontend with tokens in query params
    // Frontend should immediately exchange these for secure storage
    const { accessToken, refreshToken, isNewUser } = tokens;
    res.redirect(
      `${env.OAUTH_SUCCESS_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}&isNewUser=${isNewUser}`
    );
  })(req, res, next);
};

export const githubCallback = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate('github', { session: false }, (err: Error, tokens: any) => {
    if (err || !tokens) {
      return res.redirect(
        `${env.OAUTH_FAILURE_URL}?error=${encodeURIComponent(err?.message ?? 'oauth_failed')}`
      );
    }

    const { accessToken, refreshToken, isNewUser } = tokens;
    res.redirect(
      `${env.OAUTH_SUCCESS_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}&isNewUser=${isNewUser}`
    );
  })(req, res, next);
};

// ── Apple Redirect ────────────────────────────────────────────────────────────
export const appleRedirect = passport.authenticate('apple', {
  session: false,
});

// ── Apple Callback ────────────────────────────────────────────────────────────
// Apple sends a POST not a GET on callback — handled below
export const appleCallback = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate('apple', { session: false }, (err: Error, tokens: any) => {
    if (err || !tokens) {
      return res.redirect(
        `${env.OAUTH_FAILURE_URL}?error=${encodeURIComponent(err?.message ?? 'oauth_failed')}`
      );
    }

    const { accessToken, refreshToken, isNewUser } = tokens;
    res.redirect(
      `${env.OAUTH_SUCCESS_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}&isNewUser=${isNewUser}`
    );
  })(req, res, next);
};

// ── Linked Accounts ───────────────────────────────────────────────────────────

export const getLinkedAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accounts = await oauthService.getLinkedAccounts(req.user!.id);
    res.json(accounts);
  } catch (err) {
    next(err);
  }
};

export const unlinkAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { provider } = req.params as { provider: OAuthProvider };

  const validProviders: OAuthProvider[] = ['google', 'github', 'apple'];
  if (!validProviders.includes(provider)) {
    res.status(400).json({
      error: 'INVALID_PROVIDER',
      message: 'Provider must be one of: google, github, apple',
    });
    return;
  }

  try {
    await oauthService.unlinkAccount(req.user!.id, provider);
    res.json({ message: `${provider} account unlinked successfully` });
  } catch (err) {
    next(err);
  }
};