import { Request, Response, NextFunction } from 'express';
import { redis } from '@database/redis/client';
import { ApiError } from '@shared/utils/ApiError';

const IDEMPOTENCY_HEADER = 'x-idempotency-key';
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Idempotency middleware — prevents duplicate order/payment creation.
 *
 * Client sends `X-Idempotency-Key: <uuid>` on POST requests.
 * First call: stores the response in Redis and returns it normally.
 * Duplicate calls within 24h: returns the cached response directly (409).
 *
 * If the header is absent, the request is allowed through without caching
 * (backwards-compatible with existing API clients).
 */
export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = req.headers[IDEMPOTENCY_HEADER] as string | undefined;
  if (!key) return next();

  if (typeof key !== 'string' || key.length < 8 || key.length > 128) {
    return next(new ApiError(400, 'X-Idempotency-Key must be a string between 8 and 128 characters'));
  }

  const redisKey = `idempotency:${req.user?.id ?? 'anon'}:${key}`;
  const cached = await redis.get(redisKey);

  if (cached) {
    const parsed = JSON.parse(cached);
    res.status(parsed.status).json(parsed.body);
    return;
  }

  // Monkey-patch res.json to capture the response before sending
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 500) {
      redis.set(redisKey, JSON.stringify({ status: res.statusCode, body }), 'EX', TTL_SECONDS);
    }
    return originalJson(body);
  };

  next();
};
