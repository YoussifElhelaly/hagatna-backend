import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { verifyAccessToken } from '@shared/utils/generateToken';
import { ApiError } from '@shared/utils/ApiError';
import { prisma } from '@database/prisma/client';
import { asyncHandler } from '@shared/utils/asyncHandler';

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  // Prefer HTTP-only cookie; fall back to Bearer header for API clients / mobile
  const token: string | undefined =
    req.cookies?.accessToken ??
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined);

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
