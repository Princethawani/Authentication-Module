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
- ✅ Rate limiting per route (login, register)
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
│   │   └── database.ts             ✅ TypeORM DataSource — all entities registered here
│   │
│   ├── entities/                   ✅ TypeORM database models (replaces Prisma schema)
│   │   ├── User.ts                 ✅ Core user — email, password, lockout, verification
│   │   ├── Role.ts                 ✅ Role names (Admin, User, Moderator)
│   │   ├── UserRole.ts             ✅ Join table — composite PK (userId + roleId)
│   │   ├── RefreshToken.ts         ✅ Refresh tokens — indexed, with device/IP info
│   │   ├── TokenBlacklist.ts       ✅ Revoked access tokens — Redis + DB fallback
│   │   ├── AppEmailConfig.ts       ✅ Per-app SMTP config — multi-app email support
│   │   └── ActivityLog.ts          ✅ Audit log — LOGIN, LOGOUT, FAILED_LOGIN, etc.
│   │
│   ├── types/
│   │   ├── index.ts                ← Shared TypeScript interfaces and types
│   │   └── schemas.ts              ← Zod validation schemas (DTOs for all requests)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts       ← JWT verify + blacklist check + role guard
│   │   └── errorHandler.ts         ← Global Express error handler
│   │
│   ├── services/
│   │   ├── auth.service.ts         ← Register, login, logout, verify, reset password
│   │   ├── token.service.ts        ← Generate, rotate, blacklist, cleanup tokens
│   │   ├── email.service.ts        ← Send emails via Nodemailer + multi-app support
│   │   └── emailconfig.service.ts  ← CRUD for AppEmailConfig
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts      ← Express handlers — calls auth service
│   │   └── emailconfig.controller.ts ← Express handlers — calls emailconfig service
│   │
│   ├── routes/
│   │   ├── auth.routes.ts          ← Route definitions + middleware wiring
│   │   └── emailconfig.routes.ts   ← Route definitions + admin guard
│   │
│   ├── utils/
│   │   ├── cleanup.job.ts          ← Background job — purges expired tokens hourly
│   │   └── seed.ts                 ← Seeds default roles + admin user + email config
│   │
│   └── server.ts                   ← App entry point — Express setup, plugin registration
│
├── .env                            ← Your local secrets (never commit this)
├── .env.example                    ← Template — commit this so others know what's needed
├── .gitignore                      ✅ node_modules, dist, .env, logs, etc.
├── .dockerignore                   ← node_modules, .env, dist excluded from Docker image
├── docker-compose.yml              ← Production: app + postgres + redis
├── docker-compose.override.yml     ← Dev: hot reload + Adminer + Redis Commander
├── Dockerfile                      ← Multi-stage build (deps → builder → slim runner)
├── Makefile                        ← Convenience commands (make dev, make prod, etc.)
├── package.json                    ✅ All dependencies listed
└── tsconfig.json                   ✅ experimentalDecorators + emitDecoratorMetadata enabled
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
| `POST` | `/api/auth/revoke-session/:id` | Revoke a specific session | ✅ |

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

**Client example (JavaScript):**
```javascript
fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-ID': 'football'
  },
  body: JSON.stringify({ email, password, firstName, lastName })
});
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

# Security
BCRYPT_ROUNDS=12
MAX_FAILED_LOGINS=5
LOCKOUT_DURATION_MINUTES=15

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Getting Started

### Option A: Docker (Recommended)

```bash
git clone <repo-url> && cd authserver
cp .env.example .env        # fill in your secrets
make docker-dev             # starts app + postgres + redis + admin UIs
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
cp .env.example .env
npm run seed                # creates roles + admin user
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
# Dev (hot reload + Adminer + Redis Commander)
make docker-dev

# Production
make prod

# View logs
make logs

# Stop everything
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
```

---

## Roadmap

- [ ] Two-factor authentication (TOTP)
- [ ] OAuth2 / OpenID Connect (Google, GitHub, Apple)
- [ ] Social login
- [ ] API key authentication
- [ ] Email template customization per app
- [ ] WebAuthn / Passkeys
- [ ] Prometheus metrics endpoint

---

## License

MIT — use this as a base for your own projects.