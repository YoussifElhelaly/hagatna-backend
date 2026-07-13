import { Router } from 'express';
import passport from 'passport';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authRateLimiter, otpRateLimiter } from '@shared/middlewares/rateLimiter';
import {
  RegisterSchema,
  VerifyEmailSchema,
  ResendOtpSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './auth.validation';
import * as AuthController from './auth.controller';
import { env } from '@config/env';

const router = Router();

// ─── Local Auth ───────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
router.post(
  '/register',
  authRateLimiter,
  validate({ body: RegisterSchema }),
  AuthController.register
);

// POST /api/v1/auth/verify-email
router.post(
  '/verify-email',
  authRateLimiter,
  validate({ body: VerifyEmailSchema }),
  AuthController.verifyEmail
);

// POST /api/v1/auth/resend-otp
router.post(
  '/resend-otp',
  otpRateLimiter,
  validate({ body: ResendOtpSchema }),
  AuthController.resendOtp
);

// POST /api/v1/auth/login
router.post(
  '/login',
  authRateLimiter,
  validate({ body: LoginSchema }),
  AuthController.login
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  validate({ body: RefreshTokenSchema }),
  AuthController.refreshToken
);

// POST /api/v1/auth/logout  (requires auth)
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: ForgotPasswordSchema }),
  AuthController.forgotPassword
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate({ body: ResetPasswordSchema }),
  AuthController.resetPassword
);

// ─── Google OAuth ─────────────────────────────────────────────────────────────

// GET /api/v1/auth/google
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false,
  })
);

// GET /api/v1/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.CUSTOMER_URL}/auth/login?error=google_failed`,
  }),
  AuthController.googleCallback
);

// ─── Facebook OAuth ───────────────────────────────────────────────────────────

// GET /api/v1/auth/facebook
router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['email', 'public_profile'],
    session: false,
  })
);

// GET /api/v1/auth/facebook/callback
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${env.CUSTOMER_URL}/auth/login?error=facebook_failed`,
  }),
  AuthController.facebookCallback
);

export default router;
