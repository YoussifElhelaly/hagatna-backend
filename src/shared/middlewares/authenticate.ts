import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { verifyAccessToken } from '@shared/utils/generateToken';
import { ApiError } from '@shared/utils/ApiError';
import { prisma } from '@database/prisma/client';
import { asyncHandler } from '@shared/utils/asyncHandler';

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  // Prefer the explicit Bearer header over the ambient cookie.
  // A single browser can hold logins for multiple roles (e.g. admin + customer)
  // on the same API domain, and cookies are shared across those tabs — whichever
  // role logged in last owns the accessToken cookie. Each SPA sends its OWN token
  // in the Authorization header, so trusting the header first keeps each request
  // scoped to the identity the calling app intends, not the leftover cookie.
  const bearer: string | undefined = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : undefined;

  const token: string | undefined = bearer ?? req.cookies?.accessToken;

  if (!token) {
    throw ApiError.unauthorized('No token provided');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true, isVerified: true, isActive: true },
  });

  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is suspended');

  req.user = {
    id: user.id,
    role: user.role,
    isVerified: user.isVerified,
  };

  // Tell Sentry who made this request — shows up on every error from this user
  Sentry.setUser({ id: user.id, role: user.role });

  next();
});
