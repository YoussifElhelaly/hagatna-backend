import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiError } from '@shared/utils/ApiError';
import { env } from '@config/env';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

// Safe methods that never mutate state — no CSRF check needed
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie pattern (cross-origin aware):
 *  1. On first GET, set a random token in a readable (non-httpOnly) cookie
 *  2. On state-changing requests, client must echo it back in X-CSRF-Token header
 *  3. Server compares header vs cookie — must match
 *  4. For cross-origin SPA requests, accept valid Origin header as alternative
 *     (CORS already validates the origin against the allowed list)
 */
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate token if not present
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,       // client JS must be able to read this cookie
      secure: env.NODE_ENV === 'production',
      sameSite: 'none',      // must be 'none' for cross-origin SPA requests
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  }

  // Skip check for safe methods
  if (SAFE_METHODS.has(req.method)) return next();

  // Skip check for OAuth callbacks (browser redirect, no JS involved)
  if (req.path.includes('/auth/google') || req.path.includes('/auth/facebook')) {
    return next();
  }

  // ── Check 1: CSRF token in header matches cookie ──
  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (cookieToken && headerToken) {
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return next();
    }
  }

  // ── Check 2: Valid cross-origin Origin header (CORS already validated) ──
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/$/, '')).filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      return next();
    }
  }

  // ── Check 3: Valid Referer header from allowed origin ──
  const referer = req.headers.referer;
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      const allowedOrigins = env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/$/, '')).filter(Boolean);
      if (allowedOrigins.includes(refererOrigin)) {
        return next();
      }
    } catch {}
  }

  return next(new ApiError(403, 'Invalid CSRF token'));
};
