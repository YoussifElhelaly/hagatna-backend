import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    vendorProfile: { count: vi.fn() },
    product: { count: vi.fn() },
    user: { count: vi.fn() },
    review: { aggregate: vi.fn() },
  },
}));

vi.mock('@database/redis/client', () => ({
  redis: { get: vi.fn(), setex: vi.fn() },
  RedisKeys: { cache: { storefrontStats: () => 'cache:stats' } },
  TTL: { STATS: 300 },
}));

import * as StatsService from '@modules/stats/stats.service';
import { prisma } from '@database/prisma/client';
import { redis } from '@database/redis/client';

const mockPrisma = vi.mocked(prisma, true);
const mockRedis = vi.mocked(redis);

describe('StatsService.getStorefrontStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('computes real counts and rounds avgRating to 1 decimal', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockPrisma.vendorProfile.count.mockResolvedValueOnce(12 as never);
    mockPrisma.product.count.mockResolvedValueOnce(340 as never);
    mockPrisma.user.count.mockResolvedValueOnce(1500 as never);
    mockPrisma.review.aggregate.mockResolvedValueOnce({ _avg: { rating: 4.36 } } as never);

    const result = await StatsService.getStorefrontStats();

    expect(result).toEqual({
      storeCount: 12,
      productCount: 340,
      customerCount: 1500,
      avgRating: 4.4,
    });
    // caches the result for 5 minutes
    expect(mockRedis.setex).toHaveBeenCalledWith('cache:stats', 300, expect.any(String));
  });

  it('returns avgRating 0 when there are no reviews', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockPrisma.vendorProfile.count.mockResolvedValueOnce(0 as never);
    mockPrisma.product.count.mockResolvedValueOnce(0 as never);
    mockPrisma.user.count.mockResolvedValueOnce(0 as never);
    mockPrisma.review.aggregate.mockResolvedValueOnce({ _avg: { rating: null } } as never);

    const result = await StatsService.getStorefrontStats();
    expect(result.avgRating).toBe(0);
  });

  it('serves cached stats without querying the DB', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ storeCount: 1, productCount: 2, customerCount: 3, avgRating: 5 })
    );

    const result = await StatsService.getStorefrontStats();

    expect(result).toEqual({ storeCount: 1, productCount: 2, customerCount: 3, avgRating: 5 });
    expect(mockPrisma.product.count).not.toHaveBeenCalled();
  });
});
