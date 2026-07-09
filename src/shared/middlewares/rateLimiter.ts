import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { ApiError } from '@shared/utils/ApiError';

/** Global rate limiter — applies to all routes */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // trust proxy is configured at the app level (app.set('trust proxy', ...))
  validate: { trustProxy: false },
  handler: (_req, _res, next) => {
    next(ApiError.tooMany('Too many requests, please try again later'));
  },
});

/** Strict limiter for auth endpoints (login, register, forgot-password) */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => req.ip ?? 'unknown',
  handler: (_req, _res, next) => {
    next(ApiError.tooMany('Too many auth attempts, please try again in 15 minutes'));
  },
});

/** Newsletter subscribe limiter — prevents signup spam / list stuffing */
export const newsletterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 10 subscribe attempts / hour / IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => req.ip ?? 'unknown',
  handler: (_req, _res, next) => {
    next(ApiError.tooMany('Too many subscription attempts, please try again later'));
  },
});

/** OTP resend limiter */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  validate: { trustProxy: false },
  handler: (_req, _res, next) => {
    next(ApiError.tooMany('Too many OTP requests, please wait a minute'));
  },
});
