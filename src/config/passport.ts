import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import AppleStrategy from 'passport-apple';
import { env } from './env';
import { OAuthService } from '../services/oauth.service';

const oauthService = new OAuthService();

// ── Google ────────────────────────────────────────────────────────────────────

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const result = await oauthService.handleOAuthLogin(
            {
              provider: 'google',
              providerAccountId: profile.id,
              email: profile.emails?.[0]?.value ?? null,
              displayName: profile.displayName ?? null,
              firstName: profile.name?.givenName ?? null,
              lastName: profile.name?.familyName ?? null,
              avatarUrl: profile.photos?.[0]?.value ?? null,
              accessToken,
              refreshToken: refreshToken ?? null,
            },
            (req as any).ip,
            req.headers['user-agent']
          );
          done(null, result);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// ── GitHub ────────────────────────────────────────────────────────────────────

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        scope: ['user:email'],
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const result = await oauthService.handleOAuthLogin(
            {
              provider: 'github',
              providerAccountId: String(profile.id),
              email: profile.emails?.[0]?.value ?? null,
              displayName: profile.displayName ?? profile.username ?? null,
              firstName: profile.displayName?.split(' ')[0] ?? null,
              lastName: profile.displayName?.split(' ').slice(1).join(' ') ?? null,
              avatarUrl: profile.photos?.[0]?.value ?? null,
              accessToken,
              refreshToken: refreshToken ?? null,
            },
            req.ip,
            req.headers['user-agent']
          );
          done(null, result);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}


// ── Apple ─────────────────────────────────────────────────────────────────────

if (env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) {
  passport.use(
    new AppleStrategy(
      {
        clientID: env.APPLE_CLIENT_ID,
        teamID: env.APPLE_TEAM_ID,
        keyID: env.APPLE_KEY_ID,
        privateKeyString: env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        callbackURL: env.APPLE_CALLBACK_URL,
        scope: ['name', 'email'],
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          // Apple only sends name on the FIRST login — parse it from the form body
          let appleUser: { name?: { firstName?: string; lastName?: string } } | null = null;

          try {
            if (req.body?.user) {
              appleUser = JSON.parse(req.body.user);
            }
          } catch {
            // req.body.user is not valid JSON — ignore
          }

          const firstName =
            profile?.name?.firstName ??
            appleUser?.name?.firstName ??
            null;

          const lastName =
            profile?.name?.lastName ??
            appleUser?.name?.lastName ??
            null;

          const email = profile?.email ?? idToken?.email ?? null;
          const providerAccountId = profile?.id ?? idToken?.sub ?? null;

          if (!providerAccountId) {
            return done(new Error('OAUTH_ACCOUNT_NOT_FOUND'));
          }

          const result = await oauthService.handleOAuthLogin(
            {
              provider: 'apple',
              providerAccountId,
              email,
              displayName: firstName && lastName ? `${firstName} ${lastName}` : null,
              firstName,
              lastName,
              avatarUrl: null,
              accessToken: accessToken ?? null,
              refreshToken: refreshToken ?? null,
            },
            req.ip,
            req.headers['user-agent']
          );

          done(null, result);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

export default passport;