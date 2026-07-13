import { Request, Response, CookieOptions } from 'express';
import { User } from '@prisma/client';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import { ApiError } from '@shared/utils/ApiError';
import { env } from '@config/env';
import * as AuthService from './auth.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';
import type { AuthTokens } from './auth.types';

const isProduction = env.NODE_ENV === 'production';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
};

const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  res.cookie('accessToken', tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,           // 15 minutes
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', baseCookieOptions);
  res.clearCookie('refreshToken', baseCookieOptions);
};

// ─── POST /auth/register ──────────────────────────────────────────────────────
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  logActivity({
    action: 'register',
    category: 'auth',
    entityType: 'user',
    metadata: { email: req.body.email, name: req.body.name, role: req.body.role || 'customer' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Registration successful. Please check your email for the OTP verification code.',
    ...(result.devOtp && { extra: { devOtp: result.devOtp } }),
  });
});

// ─── POST /auth/verify-email ──────────────────────────────────────────────────
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, ...clientData } = await AuthService.verifyEmail(req.body);
  setAuthCookies(res, tokens);
  logActivity({
    userId: clientData.user.id,
    role: clientData.user.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'verify_email',
    category: 'auth',
    entityType: 'user',
    entityId: clientData.user.id,
    entityLabel: clientData.user.name,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({
    res,
    message: 'Email verified successfully',
    data: { ...clientData, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
  });
});

// ─── POST /auth/resend-otp ────────────────────────────────────────────────────
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.resendOtp(req.body.email);
  sendSuccess({
    res,
    message: 'OTP sent to your email',
    ...(result.devOtp && { extra: { devOtp: result.devOtp } }),
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, ...clientData } = await AuthService.login(req.body);
  setAuthCookies(res, tokens);
  logActivity({
    userId: clientData.user.id,
    role: clientData.user.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'login',
    category: 'auth',
    entityType: 'user',
    entityId: clientData.user.id,
    entityLabel: clientData.user.name,
    metadata: { provider: 'local' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({
    res,
    message: 'Login successful',
    data: { ...clientData, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Prefer the token the client sent explicitly in the body over the ambient
  // cookie. On a browser shared between roles (admin + customer) the refreshToken
  // cookie belongs to whichever role logged in last, so trusting the cookie first
  // would refresh the wrong identity. SPAs receive both tokens in the login
  // response body and send the refresh token back here explicitly.
  const token: string = req.body?.refreshToken ?? req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const { accessToken } = await AuthService.refreshToken(token);

  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  sendSuccess({ res, message: 'Token refreshed', data: { accessToken } });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
export const logout = asyncHandler(async (req: Request, res: Response) => {
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'logout',
    category: 'auth',
    entityType: 'user',
    entityId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  await AuthService.logout(req.user!.id);
  clearAuthCookies(res);
  sendSuccess({ res, message: 'Logged out successfully' });
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.forgotPassword(req.body.email);
  logActivity({
    action: 'forgot_password',
    category: 'auth',
    metadata: { email: req.body.email },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  // Always same response — never reveal if email exists
  sendSuccess({ res, message: 'If that email is registered, a reset link has been sent.' });
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.resetPassword(req.body.token, req.body.password);
  logActivity({
    action: 'reset_password',
    category: 'auth',
    metadata: { tokenProvided: true },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Password reset successful. Please login with your new password.' });
});

// ─── GET /auth/google/callback ────────────────────────────────────────────────
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as unknown as User;
  if (!user) throw ApiError.unauthorized('Google authentication failed');

  const tokens = await AuthService.handleOAuthSuccess(user);
  setAuthCookies(res, tokens);
  logActivity({
    userId: user.id,
    role: user.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'oauth_login',
    category: 'auth',
    entityType: 'user',
    entityId: user.id,
    entityLabel: user.name,
    metadata: { provider: 'google' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  // Redirect without tokens in URL — cookies carry the session
  res.redirect(`${env.CUSTOMER_URL}/auth/callback`);
});

// ─── GET /auth/facebook/callback ──────────────────────────────────────────────
export const facebookCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as unknown as User;
  if (!user) throw ApiError.unauthorized('Facebook authentication failed');

  const tokens = await AuthService.handleOAuthSuccess(user);
  setAuthCookies(res, tokens);
  logActivity({
    userId: user.id,
    role: user.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'oauth_login',
    category: 'auth',
    entityType: 'user',
    entityId: user.id,
    entityLabel: user.name,
    metadata: { provider: 'facebook' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.redirect(`${env.CUSTOMER_URL}/auth/callback`);
});
