import { User } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';
import { hashPassword, comparePassword } from '@shared/utils/hashPassword';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateOTP,
  generateSecureToken,
  hashToken,
} from '@shared/utils/generateToken';
import { ApiError } from '@shared/utils/ApiError';
import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from '@shared/utils/email';
import { env } from '@config/env';
import { Role } from '@prisma/client';
import type {
  RegisterInput,
  VerifyEmailInput,
  LoginInput,
  AuthResponse,
  AuthTokens,
} from './auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const buildTokens = (user: Pick<User, 'id' | 'role' | 'isVerified'>): AuthTokens => ({
  accessToken: generateAccessToken({ id: user.id, role: user.role, isVerified: user.isVerified }),
  refreshToken: generateRefreshToken({ id: user.id, role: user.role, isVerified: user.isVerified }),
});

const vendorSelect = {
  id: true,
  storeName: true,
  storeSlug: true,
  city: true,
  country: true,
  commissionRate: true,
  status: true,
  verifiedAt: true,
  createdAt: true,
  plan: {
    select: {
      id: true,
      name: true,
      maxProducts: true,
      categories: {
        select: { category: { select: { id: true, name: true, slug: true } } },
      },
    },
  },
  _count: { select: { products: true } },
} as const;

const fetchVendorForAuth = async (userId: string) => {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorSelect,
  });
  if (!profile) return null;
  return {
    ...profile,
    plan: profile.plan
      ? { ...profile.plan, categories: (profile.plan as any).categories?.map((c: any) => c.category) ?? [] }
      : null,
    _count: undefined,
  };
};

const buildAuthResponse = async (user: User, tokens: AuthTokens): Promise<AuthResponse> => {
  const vendor = await fetchVendorForAuth(user.id);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      avatar: user.avatar,
    },
    vendor,
    tokens,
  };
};

const storeRefreshToken = async (userId: string, refreshToken: string): Promise<void> => {
  const hashed = hashToken(refreshToken);
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: hashed },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
export const register = async (input: RegisterInput): Promise<{ devOtp?: string }> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.customer,
      phone: input.phone,
    },
  });

  // Generate OTP and store its hash in Redis
  const otp = generateOTP();
  await redis.set(RedisKeys.otp(user.email), hashToken(otp), 'EX', TTL.OTP);

  // Send verification email (non-blocking)
  sendOtpEmail(user.email, user.name, otp);

  // In development, return OTP directly so devs don't need a real email server
  return env.NODE_ENV === 'development' ? { devOtp: otp } : {};
};

// ─────────────────────────────────────────────────────────────────────────────
// verifyEmail
// ─────────────────────────────────────────────────────────────────────────────
export const verifyEmail = async (input: VerifyEmailInput): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.isVerified) throw ApiError.badRequest('Invalid or expired OTP');

  const storedOtpHash = await redis.get(RedisKeys.otp(input.email));
  if (!storedOtpHash || storedOtpHash !== hashToken(input.otp)) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  // Clear OTP from Redis
  await redis.del(RedisKeys.otp(input.email));

  // Send welcome email
  sendWelcomeEmail(user.email, user.name);

  const tokens = buildTokens(updatedUser);
  await storeRefreshToken(updatedUser.id, tokens.refreshToken);

  return buildAuthResponse(updatedUser, tokens);
};

// ─────────────────────────────────────────────────────────────────────────────
// resendOtp
// ─────────────────────────────────────────────────────────────────────────────
export const resendOtp = async (email: string): Promise<{ devOtp?: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Return generic success to prevent user enumeration
  if (!user || user.isVerified) return {};

  const otp = generateOTP();
  await redis.set(RedisKeys.otp(email), hashToken(otp), 'EX', TTL.OTP);
  sendOtpEmail(email, user.name, otp);

  return env.NODE_ENV === 'development' ? { devOtp: otp } : {};
};

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Generic message — don't reveal whether email exists
  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await comparePassword(input.password, user.passwordHash);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  if (!user.isVerified) throw ApiError.badRequest('Please verify your email before logging in');
  if (!user.isActive) throw ApiError.forbidden('Account is suspended. Contact support.');

  const tokens = buildTokens(user);
  await storeRefreshToken(user.id, tokens.refreshToken);

  return buildAuthResponse(user, tokens);
};

// ─────────────────────────────────────────────────────────────────────────────
// refreshToken
// ─────────────────────────────────────────────────────────────────────────────
export const refreshToken = async (token: string): Promise<{ accessToken: string }> => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true, isVerified: true, isActive: true, refreshToken: true },
  });

  if (!user || !user.refreshToken) throw ApiError.unauthorized('Session expired, please login again');
  if (!user.isActive) throw ApiError.forbidden('Account is suspended');

  const hashed = hashToken(token);
  if (hashed !== user.refreshToken) throw ApiError.unauthorized('Invalid refresh token');

  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    isVerified: user.isVerified,
  });

  return { accessToken };
};

// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────
export const logout = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// forgotPassword
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — never reveal if email exists
  if (!user || !user.passwordHash) return;

  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);

  // Store: key = hashed token, value = userId, TTL = 30min
  await redis.set(`reset:${hashedToken}`, user.id, 'EX', TTL.RESET_TOKEN);

  // Route the reset link to the frontend that matches the user's role.
  const roleUrl =
    user.role === 'admin' ? env.ADMIN_URL : user.role === 'vendor' ? env.VENDOR_URL : env.CUSTOMER_URL;
  const resetUrl = `${roleUrl}/auth/reset-password?token=${rawToken}`;
  sendPasswordResetEmail(email, user.name, resetUrl);
};

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = hashToken(token);
  const userId = await redis.get(`reset:${hashedToken}`);

  if (!userId) throw ApiError.badRequest('Invalid or expired reset link');

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      refreshToken: null,     // force re-login on all devices
    },
  });

  await redis.del(`reset:${hashedToken}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// handleOAuthSuccess  (called by passport callback)
// ─────────────────────────────────────────────────────────────────────────────
export const handleOAuthSuccess = async (user: User): Promise<AuthTokens> => {
  if (!user.isActive) throw ApiError.forbidden('Account is suspended');

  const tokens = buildTokens(user);
  await storeRefreshToken(user.id, tokens.refreshToken);
  return tokens;
};
