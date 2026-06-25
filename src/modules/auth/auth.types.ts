import { Role } from '@prisma/client';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  phone?: string;
}

export interface VerifyEmailInput {
  email: string;
  otp: string;
}

export interface ResendOtpInput {
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  avatar: string | null;
}

/** Full auth result from service — tokens used internally by controller to set cookies */
export interface AuthResponse {
  user: AuthUserData;
  vendor: Record<string, unknown> | null;
  tokens: AuthTokens;
}

/** What the client actually receives — no tokens in body (they're in HTTP-only cookies) */
export interface AuthClientResponse {
  user: AuthUserData;
  vendor: Record<string, unknown> | null;
}
