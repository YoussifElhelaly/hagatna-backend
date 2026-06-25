import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@config/env';
import { JwtPayload } from '@shared/types';

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};

/** Generates a cryptographically secure random token (for password reset, etc.) */
export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/** Generates a 6-digit numeric OTP (CSPRNG) */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/** Hashes a token for safe storage in DB/Redis */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
