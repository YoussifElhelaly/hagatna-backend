import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';

export interface StorefrontStats {
  storeCount: number;
  productCount: number;
  customerCount: number;
  avgRating: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// getStorefrontStats  —  real counts for Hero + About numbers, cached ~5 min
// ─────────────────────────────────────────────────────────────────────────────
export const getStorefrontStats = async (): Promise<StorefrontStats> => {
  const cacheKey = RedisKeys.cache.storefrontStats();
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as StorefrontStats;

  const [storeCount, productCount, customerCount, ratingAgg] = await Promise.all([
    prisma.vendorProfile.count({ where: { status: 'approved' } }),
    prisma.product.count({ where: { status: 'active', deletedAt: null } }),
    prisma.user.count({ where: { role: 'customer', isActive: true } }),
    prisma.review.aggregate({
      where: { status: 'approved', deletedAt: null },
      _avg: { rating: true },
    }),
  ]);

  const stats: StorefrontStats = {
    storeCount,
    productCount,
    customerCount,
    // round to 1 decimal; 0 when there are no reviews yet
    avgRating: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
  };

  await redis.setex(cacheKey, TTL.STATS, JSON.stringify(stats));
  return stats;
};
