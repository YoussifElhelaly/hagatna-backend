import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiError } from '@shared/utils/ApiError';
import { env } from '@config/env';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

// Safe methods that never mutate state — no CSRF check needed
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie pattern:
 *  1. On first GET, set a random token in a readable (non-httpOnly) cookie
 *  2. On state-changing requests, client must echo it back in X-CSRF-Token header
 *  3. Server compares header vs cookie — must match
 */
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate token if not present
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,       // client JS must be able to read this cookie
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  }

  // Skip check for safe methods
  if (SAFE_METHODS.has(req.method)) return next();

  // Skip check for OAuth callbacks (browser redirect, no JS involved)
  if (req.path.includes('/auth/google') || req.path.includes('/auth/facebook')) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  const a = Buffer.from(cookieToken ?? '');
  const b = Buffer.from(headerToken ?? '');
  const invalid = !cookieToken || !headerToken || a.length !== b.length || !crypto.timingSafeEqual(a, b);
  if (invalid) {
    return next(new ApiError(403, 'Invalid CSRF token'));
  }

  next();
};
