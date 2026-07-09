import Redis from 'ioredis';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis: connecting...'));
redis.on('ready', () => logger.info('Redis: ready'));
redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('close', () => logger.warn('Redis: connection closed'));
redis.on('reconnecting', () => logger.info('Redis: reconnecting...'));

// ─── Redis Key Helpers ────────────────────────────────────────────────────────
export const RedisKeys = {
  otp: (email: string) => `otp:${email}`,
  resetToken: (token: string) => `reset:${token}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  rateLimit: (ip: string, route: string) => `rl:${route}:${ip}`,
  cache: {
    categories: () => 'cache:categories',
    product: (slug: string) => `cache:product:${slug}`,
    featuredProducts: () => 'cache:products:featured',
    attributeDefinitions: (categoryId: string) => `cache:attrs:${categoryId}`,
    storefrontStats: () => 'cache:stats',
    brands: () => 'cache:brands',
    homeSections: () => 'cache:home-sections',
  },
};

// ─── TTL Constants (seconds) ──────────────────────────────────────────────────
export const TTL = {
  OTP: 600,             // 10 minutes
  RESET_TOKEN: 1800,    // 30 minutes
  CATEGORIES: 3600,     // 1 hour
  PRODUCT: 900,         // 15 minutes
  FEATURED: 600,        // 10 minutes
  STATS: 300,           // 5 minutes
  BRANDS: 3600,         // 1 hour
  HOME_SECTIONS: 120,   // 2 minutes
};
