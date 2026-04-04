import { Request } from 'express';

// ── JWT ───────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // user id
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// ── Authenticated Request ─────────────────────────────────────────────────────
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  appId?: string;
}

// ── Auth Responses ────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;   // seconds
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AuthResponse extends AuthTokens {
  user: UserProfile;
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Error ─────────────────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}