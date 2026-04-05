import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file
config();

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  APP_URL: z.string().default('http://localhost:3000'),

  // Database (PostgreSQL)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432'),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: z.string().default('30'),

  // Email (fallback SMTP)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USERNAME: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  DEFAULT_FROM_EMAIL: z.string().default('noreply@authserver.com'),

  // Security
  BCRYPT_ROUNDS: z.string().default('12'),
  MAX_FAILED_LOGINS: z.string().default('5'),
  LOCKOUT_DURATION_MINUTES: z.string().default('15'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // SEEDER
  ADMIN_EMAIL: z.string().email().default('admin@authserver.com'),
  ADMIN_PASSWORD: z.string().default('Admin@123'),

  // OAuth — Google
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3000/api/oauth/google/callback'),

  // OAuth — GitHub
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:3000/api/oauth/github/callback'),

  // OAuth — Apple
  APPLE_CLIENT_ID: z.string().default(''),
  APPLE_TEAM_ID: z.string().default(''),
  APPLE_KEY_ID: z.string().default(''),
  APPLE_PRIVATE_KEY: z.string().default(''),
  APPLE_CALLBACK_URL: z.string().default('http://localhost:3000/api/oauth/apple/callback'),

  // OAuth redirect URLs
  OAUTH_SUCCESS_URL: z.string().default('http://localhost:5173/auth/success'),
  OAUTH_FAILURE_URL: z.string().default('http://localhost:5173/auth/failure'),

});

// Validate — crash early if something is wrong
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  result.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = result.data;

// Derived helpers so you don't repeat parseInt() everywhere
export const DB_PORT = parseInt(env.DB_PORT);
export const PORT = parseInt(env.PORT);
export const BCRYPT_ROUNDS = parseInt(env.BCRYPT_ROUNDS);
export const MAX_FAILED_LOGINS = parseInt(env.MAX_FAILED_LOGINS);
export const LOCKOUT_DURATION_MS = parseInt(env.LOCKOUT_DURATION_MINUTES) * 60 * 1000;
export const REFRESH_EXPIRY_DAYS = parseInt(env.JWT_REFRESH_EXPIRY_DAYS);