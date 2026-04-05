# AuthServer

A reusable, secure, and scalable authentication server for **web and mobile applications**  
Built with **Node.js + TypeScript + Express + TypeORM + PostgreSQL + Redis**

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Language** | TypeScript (Node.js 20) | Type safety, great ecosystem |
| **Framework** | Express v4 | Mature, flexible, widely understood |
| **Database** | PostgreSQL 16 | Open source, production-grade |
| **ORM** | TypeORM | Decorator-based entities, migrations built-in |
| **Cache / Blacklist** | Redis (ioredis) | O(1) token blacklist lookups |
| **Auth** | jsonwebtoken + bcryptjs | Battle-tested JWT + password hashing |
| **Email** | Nodemailer | Multi-app SMTP support |
| **Rate Limiting** | express-rate-limit | Per-route brute force protection |
| **Validation** | Zod | Schema validation + TypeScript types in one |
| **Security Headers** | Helmet | XSS, clickjacking, MIME sniffing protection |
| **API Docs** | swagger-ui-express | Auto-generated Swagger UI |
| **Containerization** | Docker + Docker Compose | Dev and production ready |

---

## Features

### Core Authentication
- ✅ User registration with email verification
- ✅ Login with JWT access tokens (15 min)
- ✅ Refresh token rotation with reuse detection
- ✅ Secure logout with Redis token blacklisting
- ✅ Password reset via email
- ✅ Email verification flow

### Security
- ✅ JWT Bearer authentication
- ✅ Password hashing with bcrypt (configurable rounds)
- ✅ Redis-backed token blacklist — instant revocation
- ✅ Rate limiting per route (login, register, forgot-password)
- ✅ Account lockout after N failed logins
- ✅ Refresh token reuse detection (revokes all sessions on replay attack)
- ✅ CORS with configurable allowed origins
- ✅ Helmet security headers

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Built-in roles: Admin, User, Moderator
- ✅ Admin role management endpoints
- ✅ Per-route middleware guards

### User Management
- ✅ Profile get & update
- ✅ Activity log (logins, logouts, failures)
- ✅ Session management (list & revoke active sessions)
- ✅ Admin: list all users, assign/remove roles

### Two-Factor Authentication
- ✅ TOTP-based 2FA (Google Authenticator, Authy, etc.)
- ✅ QR code generation for easy setup
- ✅ 8 one-time backup codes per user
- ✅ Backup code single-use enforcement

### OAuth2 / Social Login
- ✅ Google OAuth2
- ✅ GitHub OAuth2
- ✅ Apple Sign In
- ✅ Auto account creation on first OAuth login
- ✅ Link / unlink OAuth providers per account

### Multi-App Email (X-App-ID)
- ✅ One server, unlimited branded apps via `X-App-ID` header
- ✅ Database-driven email config per app
- ✅ Admin API to manage configs
- ✅ Fallback to env-level SMTP config

### Ops
- ✅ `GET /api/auth/health` endpoint
- ✅ Background token cleanup job
- ✅ Swagger UI at `/docs`
- ✅ Structured logging
- ✅ Docker + Docker Compose (dev & prod)
- ✅ Graceful shutdown

---

## Project Structure

```
authserver/
├── src/
│   ├── config/
│   │   ├── env.ts                  ✅ Env vars — validated with Zod, typed export
│   │   ├── redis.ts                ✅ Redis singleton — connect, disconnect, getRedis()
│   │   ├── database.ts             ✅ TypeORM DataSource — glob entity loading
│   │   └── passport.ts             ✅ Passport strategies — Google, GitHub, Apple
│   │
│   ├── entities/                   ✅ TypeORM database models (auto-loaded via glob)
│   │   ├── User.ts                 ✅ Core user — email, password, lockout, verification
│   │   ├── Role.ts                 ✅ Role names (Admin, User, Moderator)
│   │   ├── UserRole.ts             ✅ Join table — composite PK (userId + roleId)
│   │   ├── RefreshToken.ts         ✅ Refresh tokens — indexed, with device/IP info
│   │   ├── TokenBlacklist.ts       ✅ Revoked access tokens — Redis + DB fallback
│   │   ├── AppEmailConfig.ts       ✅ Per-app SMTP config — multi-app email support
│   │   ├── ActivityLog.ts          ✅ Audit log — LOGIN, LOGOUT, FAILED_LOGIN, etc.
│   │   ├── TwoFactorSecret.ts      ✅ TOTP secrets + backup codes per user
│   │   └── OAuthAccount.ts         ✅ Linked OAuth provider accounts per user
│   │
│   ├── types/
│   │   ├── index.ts                ✅ Shared TypeScript interfaces and types
│   │   └── schemas.ts              ✅ Zod validation schemas (DTOs for all requests)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      ✅ JWT verify + blacklist check + role guard
│   │   └── errorHandler.ts        ✅ Global Express error handler + error map
│   │
│   ├── services/
│   │   ├── auth.service.ts         ✅ Register, login, logout, verify, reset password
│   │   ├── token.service.ts        ✅ Generate, rotate, blacklist, cleanup tokens
│   │   ├── email.service.ts        ✅ Send emails via Nodemailer + multi-app support
│   │   ├── emailconfig.service.ts  ✅ CRUD for AppEmailConfig
│   │   ├── totp.service.ts         ✅ TOTP setup, enable, disable, validate, backup codes
│   │   └── oauth.service.ts        ✅ OAuth login — find/create/link user accounts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts      ✅ Express handlers — calls auth service
│   │   ├── emailconfig.controller.ts ✅ Express handlers — calls emailconfig service
│   │   ├── totp.controller.ts      ✅ 2FA setup, enable, disable, validate
│   │   └── oauth.controller.ts     ✅ OAuth redirects and callbacks
│   │
│   ├── routes/
│   │   ├── auth.routes.ts          ✅ Route definitions + middleware + rate limiters
│   │   ├── emailconfig.routes.ts   ✅ Route definitions + admin guard
│   │   ├── totp.routes.ts          ✅ 2FA routes — all require authentication
│   │   └── oauth.routes.ts         ✅ OAuth routes — Google, GitHub, Apple
│   │
│   ├── utils/
│   │   ├── cleanup.job.ts          ✅ Background job — purges expired tokens hourly
│   │   └── seed.ts                 ✅ Seeds default roles + admin user + email config
│   │
│   └── server.ts                   ✅ App entry point — Express setup, graceful shutdown
│
├── api.docs.yaml                   ✅ OpenAPI 3.0 spec — import into Postman / Insomnia
├── .env                            ← Your local secrets (never commit this)
├── .env.example                    ✅ Template — commit this so others know what's needed
├── .gitignore                      ✅ node_modules, dist, .env, logs, etc.
├── .dockerignore                   ✅ node_modules, .env, dist excluded from Docker image
├── docker-compose.yml              ✅ Production: app + postgres + redis
├── docker-compose.override.yml     ✅ Dev: hot reload + Adminer + Redis Commander
├── Dockerfile                      ✅ Multi-stage build (deps → builder → runner)
├── Makefile                        ✅ Convenience commands
├── package.json                    ✅ All dependencies listed
├── tsconfig.json                   ✅ experimentalDecorators + emitDecoratorMetadata enabled
├── README.md                       ✅ This file
└── LICENSE                         ✅ MIT License — Prince Thawani

```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Login, receive tokens | No |
| `POST` | `/api/auth/refresh` | Refresh access token | No |
| `POST` | `/api/auth/logout` | Logout + blacklist token | ✅ |
| `GET` | `/api/auth/verify-email?token=` | Verify email address | No |
| `POST` | `/api/auth/forgot-password` | Request password reset email | No |
| `POST` | `/api/auth/reset-password` | Reset password with token | No |
| `GET` | `/api/auth/health` | Health check | No |

### User

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/auth/profile` | Get own profile | ✅ |
| `PUT` | `/api/auth/profile` | Update profile | ✅ |
| `GET` | `/api/auth/activity` | View activity log | ✅ |
| `GET` | `/api/auth/sessions` | List active sessions | ✅ |
| `POST` | `/api/auth/revoke-session/:tokenId` | Revoke a specific session | ✅ |

### Admin

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/auth/users` | List all users (paginated) | Admin |
| `POST` | `/api/auth/assign-role` | Assign role to user | Admin |
| `POST` | `/api/auth/remove-role` | Remove role from user | Admin |

### Email Config (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/emailconfig` | List all email configs |
| `GET` | `/api/emailconfig/:id` | Get one config |
| `POST` | `/api/emailconfig` | Create new config |
| `PUT` | `/api/emailconfig/:id` | Update config |
| `DELETE` | `/api/emailconfig/:id` | Delete config |
| `POST` | `/api/emailconfig/:id/toggle` | Enable / disable config |

### Two-Factor Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/2fa/status` | Check if 2FA is enabled | ✅ |
| `POST` | `/api/2fa/setup` | Generate QR code + secret | ✅ |
| `POST` | `/api/2fa/enable` | Confirm setup with a code | ✅ |
| `POST` | `/api/2fa/disable` | Disable 2FA | ✅ |
| `POST` | `/api/2fa/validate` | Validate code during login | ✅ |

### OAuth2 / Social Login

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/oauth/google` | Redirect to Google login | No |
| `GET` | `/api/oauth/google/callback` | Google OAuth callback | No |
| `GET` | `/api/oauth/github` | Redirect to GitHub login | No |
| `GET` | `/api/oauth/github/callback` | GitHub OAuth callback | No |
| `GET` | `/api/oauth/apple` | Redirect to Apple login | No |
| `POST` | `/api/oauth/apple/callback` | Apple OAuth callback | No |
| `GET` | `/api/oauth/linked` | List linked OAuth accounts | ✅ |
| `DELETE` | `/api/oauth/unlink/:provider` | Unlink an OAuth provider | ✅ |

---

## Authentication Flow

```
REGISTER
────────
Client ──POST /register──▶ AuthServer ──▶ Hash password
                                      ──▶ Save user (unverified)
                                      ──▶ Send verification email
                                      ◀── 201 { message }

VERIFY EMAIL
────────────
Client ──GET /verify-email?token=──▶ AuthServer ──▶ Mark isEmailVerified = true
                                                 ◀── 200 { message }

LOGIN
─────
Client ──POST /login──▶ AuthServer ──▶ Check password + lockout
                                   ──▶ Generate accessToken (15m)
                                   ──▶ Generate refreshToken (30d) saved to DB
                                   ◀── 200 { accessToken, refreshToken, user }

REFRESH
───────
Client ──POST /refresh──▶ AuthServer ──▶ Validate refreshToken
                                     ──▶ Revoke old refreshToken
                                     ──▶ Issue new accessToken + refreshToken
                                     ◀── 200 { accessToken, refreshToken }

LOGOUT
──────
Client ──POST /logout──▶ AuthServer ──▶ Blacklist accessToken in Redis
    (Bearer token)                   ──▶ Revoke all refreshTokens for user
                                     ◀── 200 { message }
```

### Refresh Token Reuse Detection

If a refresh token is used more than once (replay attack), the server detects this
and immediately revokes **all sessions** for that user, forcing a full re-login.

### OAuth Flow

```
Browser  ──GET /api/oauth/google──▶ AuthServer ──▶ Redirect to Google
Google   ──▶ User approves
Google   ──GET /api/oauth/google/callback──▶ AuthServer
                                          ──▶ Find or create user
                                          ──▶ Generate JWT tokens
                                          ──▶ Redirect to frontend
                                              ?accessToken=...
                                              &refreshToken=...
                                              &isNewUser=true
```

---

## OAuth Setup Guides

### Google OAuth

**Step 1 — Create a Google Cloud Project**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Give it a name and click **Create**

**Step 2 — Enable the OAuth API**

1. In the left menu go to **APIs & Services** → **Library**
2. Search for **Google+ API** or **Google Identity** and enable it

**Step 3 — Configure the OAuth consent screen**

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing) or **Internal** (for org only)
3. Fill in app name, support email, and developer contact email
4. Add scopes: `email`, `profile`, `openid`
5. Add your email to **Test users** while in development

**Step 4 — Create credentials**

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/oauth/google/callback`
   - Production: `https://yourdomain.com/api/oauth/google/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

**Step 5 — Add to `.env`**

```bash
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/oauth/google/callback
```

---

### GitHub OAuth

**Step 1 — Create a GitHub OAuth App**

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - **Application name**: AuthServer (or your app name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/oauth/github/callback`
4. Click **Register application**

**Step 2 — Get your credentials**

1. Copy the **Client ID** shown on the app page
2. Click **Generate a new client secret**
3. Copy the **Client Secret** immediately — it won't be shown again

**Step 3 — Add to `.env`**

```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback
```

> **Note:** For production, go back to your GitHub OAuth App settings and update the **Authorization callback URL** to your production domain.

---

### Apple Sign In

> Apple Sign In requires an **Apple Developer account** ($99/year) and only works with **HTTPS** in production. For local development you can test the flow with ngrok.

**Step 1 — Enable Sign In with Apple**

1. Go to [developer.apple.com](https://developer.apple.com)
2. Go to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → select your App ID (or create one)
4. Enable **Sign In with Apple** and click **Edit**
5. Configure domains and return URLs:
   - Development (via ngrok): `https://your-ngrok-url.ngrok.io/api/oauth/apple/callback`
   - Production: `https://yourdomain.com/api/oauth/apple/callback`
6. Save

**Step 2 — Create a Services ID (this is your Client ID)**

1. In **Identifiers**, click **+** and choose **Services IDs**
2. Give it a description and a unique identifier e.g. `com.yourapp.auth`
3. Enable **Sign In with Apple**
4. Click **Configure** and add your domain and return URL from Step 1
5. Save and register — this identifier becomes your `APPLE_CLIENT_ID`

**Step 3 — Create a Key**

1. In **Keys**, click **+**
2. Give it a name, enable **Sign In with Apple**
3. Click **Configure** → select your Primary App ID
4. Click **Save** → **Continue** → **Register**
5. **Download the `.p8` file immediately** — you can only download it once
6. Note your **Key ID** shown on the page

**Step 4 — Get your Team ID**

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Your **Team ID** is shown in the top right corner (10 characters)

**Step 5 — Prepare your private key**

Open the downloaded `.p8` file in a text editor. It looks like this:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

For the `.env` file, replace newlines with `\n`:

```bash
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49...\n-----END PRIVATE KEY-----
```

**Step 6 — Add to `.env`**

```bash
APPLE_CLIENT_ID=com.yourapp.auth
APPLE_TEAM_ID=ABCD1234EF
APPLE_KEY_ID=ABC123DEFG
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT_HERE\n-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/oauth/apple/callback
```

> **Apple quirks to be aware of:**
> - Apple only sends the user's **name on the very first login**. It is never sent again. The server saves it immediately on first login.
> - Apple does **not provide a profile picture**.
> - The callback is a **POST request**, not GET like Google/GitHub.
> - Apple requires a **real HTTPS domain** — localhost won't work. Use [ngrok](https://ngrok.com) for local testing.

**Testing Apple locally with ngrok:**

```bash
# Install ngrok and expose your local server
ngrok http 3000

# Use the https ngrok URL as your callback URL
# e.g. https://abc123.ngrok.io/api/oauth/apple/callback
# Update APPLE_CALLBACK_URL in .env to match
```

---

## Frontend OAuth Integration

After a successful OAuth login the server redirects to your frontend with tokens in the URL:

```
http://localhost:5173/auth/success?accessToken=eyJ...&refreshToken=abc123...&isNewUser=true
```

**React example — handle the redirect:**

```javascript
// pages/auth/success.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const isNewUser = params.get('isNewUser') === 'true';

    if (!accessToken || !refreshToken) {
      navigate('/login?error=oauth_failed');
      return;
    }

    // Store tokens securely
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Redirect based on whether this is a new user
    navigate(isNewUser ? '/onboarding' : '/dashboard');
  }, []);

  return <p>Signing you in...</p>;
}
```

**Trigger OAuth login — just open the URL in the browser:**

```javascript
// Google
window.location.href = 'http://localhost:3000/api/oauth/google';

// GitHub
window.location.href = 'http://localhost:3000/api/oauth/github';

// Apple
window.location.href = 'http://localhost:3000/api/oauth/apple';
```

**Configure redirect URLs in `.env`:**

```bash
OAUTH_SUCCESS_URL=http://localhost:5173/auth/success
OAUTH_FAILURE_URL=http://localhost:5173/auth/failure
```

---

## Two-Factor Authentication Flow

```
SETUP
─────
POST /api/2fa/setup    ──▶ Returns { secret, qrCodeUrl, manualEntryCode }
                           Show qrCodeUrl as <img src={qrCodeUrl} />
                           User scans with Google Authenticator / Authy

ENABLE
──────
POST /api/2fa/enable   ──▶ Body: { code: "123456" }
                       ◀── Returns { message, backupCodes: [...8 codes] }
                           Save backup codes — shown ONCE, never again

LOGIN WITH 2FA
──────────────
POST /api/auth/login   ──▶ Password verified
                       ◀── { accessToken, refreshToken, user }
POST /api/2fa/validate ──▶ Body: { code: "123456" }
                       ◀── { message: "2FA validated successfully" }
```

---

## Multi-App Email (X-App-ID)

Send `X-App-ID: <appId>` on any request that triggers an email.
The server picks the matching active config from `app_email_configs` table.

```
Football App  ──▶  X-App-ID: football  ──▶  noreply@football.com
Gaming App    ──▶  X-App-ID: gaming    ──▶  noreply@gaming.com
E-Commerce    ──▶  X-App-ID: store     ──▶  noreply@store.com
(no header)   ──▶  uses first active config as default
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=authuser
DB_PASSWORD=authpass
DB_NAME=authdb

# Redis
REDIS_URL=redis://localhost:6379

# JWT — use long random strings in production!
JWT_ACCESS_SECRET=your_secret_min_32_characters_long
JWT_REFRESH_SECRET=your_other_secret_min_32_characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY_DAYS=30

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@gmail.com
SMTP_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=noreply@authserver.com

# Admin seed account — change in production!
ADMIN_EMAIL=admin@authserver.com
ADMIN_PASSWORD=Admin@123

# Security
BCRYPT_ROUNDS=12
MAX_FAILED_LOGINS=5
LOCKOUT_DURATION_MINUTES=15

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# OAuth — Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/oauth/google/callback

# OAuth — GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback

# OAuth — Apple
APPLE_CLIENT_ID=com.yourapp.auth
APPLE_TEAM_ID=ABCD1234EF
APPLE_KEY_ID=ABC123DEFG
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=http://localhost:3000/api/oauth/apple/callback

# OAuth redirect URLs — point these to your frontend
OAUTH_SUCCESS_URL=http://localhost:5173/auth/success
OAUTH_FAILURE_URL=http://localhost:5173/auth/failure
```

---

## Getting Started

### Option A: Docker (Recommended)

```bash
git clone <repo-url> && cd authserver
cp .env.example .env        # fill in your secrets
make dev                    # starts app + postgres + redis + admin UIs
```

| Service | URL |
|---|---|
| Auth Server | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| Adminer (DB) | http://localhost:8080 |
| Redis Commander | http://localhost:8081 |

### Option B: Local

```bash
npm install
cp .env.example .env        # fill in your secrets
npm run seed                # creates roles + admin user + default email config
npm run dev
```

---

## Default Admin Account

Created automatically by the seed script:

| Field | Value |
|---|---|
| Email | `admin@authserver.com` |
| Password | `Admin@123` |
| Role | `Admin` |

> Change this immediately in production!

---

## Docker Commands

```bash
# Dev — hot reload + Adminer + Redis Commander
make dev

# Dev in background
make dev-bg

# Production
make prod

# View app logs
make logs

# Stop all containers
make down

# Full teardown including volumes
make clean
```

---

## Database Schema

```
users
 ├── id (uuid, PK)
 ├── email (unique)
 ├── passwordHash
 ├── firstName / lastName
 ├── isEmailVerified
 ├── emailVerificationToken
 ├── passwordResetToken
 ├── failedLoginAttempts
 ├── lockoutUntil
 └── lastLoginAt

roles
 ├── id (uuid, PK)
 ├── name (unique)         ← Admin | User | Moderator
 └── description

user_roles                 ← Join table
 ├── userId (FK → users)
 └── roleId (FK → roles)

refresh_tokens
 ├── id (uuid, PK)
 ├── token (unique, indexed)
 ├── userId (FK → users, indexed)
 ├── expiresAt
 ├── isRevoked
 ├── deviceInfo
 └── ipAddress

token_blacklist
 ├── id (uuid, PK)
 ├── token (unique, indexed)
 └── expiresAt (indexed)

app_email_configs
 ├── id (uuid, PK)
 ├── appId (unique)
 ├── fromEmail / fromName
 ├── smtpHost / smtpPort
 ├── smtpUsername / smtpPassword
 └── isActive

activity_logs
 ├── id (uuid, PK)
 ├── userId (FK → users, indexed)
 ├── action               ← LOGIN | LOGOUT | FAILED_LOGIN | etc.
 ├── ipAddress / userAgent
 ├── metadata (jsonb)
 └── createdAt (indexed)

two_factor_secrets
 ├── id (uuid, PK)
 ├── userId (unique, FK → users)
 ├── secret
 ├── isEnabled
 └── backupCodes          ← comma-separated hashed backup codes

oauth_accounts
 ├── id (uuid, PK)
 ├── userId (FK → users, indexed)
 ├── provider             ← google | github | apple
 ├── providerAccountId (indexed)
 ├── email
 ├── displayName
 ├── avatarUrl
 ├── accessToken
 └── refreshToken
```

---

## Roadmap

- ✅ Two-factor authentication (TOTP)
- ✅ OAuth2 / OpenID Connect (Google, GitHub, Apple)
- ✅ Social login
- [ ] API key authentication
- [ ] Email template customization per app
- [ ] WebAuthn / Passkeys
- [ ] Prometheus metrics endpoint

---

See [LICENSE](./LICENSE) for full license terms.