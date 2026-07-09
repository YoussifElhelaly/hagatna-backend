import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: { brand: { findMany: vi.fn() } },
}));

vi.mock('@database/redis/client', () => ({
  redis: { get: vi.fn(), setex: vi.fn() },
  RedisKeys: { cache: { brands: () => 'cache:brands' } },
  TTL: { BRANDS: 3600 },
}));

import * as BrandsService from '@modules/brands/brands.service';
import { prisma } from '@database/prisma/client';
import { redis } from '@database/redis/client';

const mockBrand = vi.mocked(prisma.brand);
const mockRedis = vi.mocked(redis);

describe('BrandsService.listBrands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns active brands and omits null logos', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockBrand.findMany.mockResolvedValueOnce([
      { id: 'b1', name: 'Apple', slug: 'apple', logo: 'apple.png' },
      { id: 'b2', name: 'Sony', slug: 'sony', logo: null },
    ] as never);

    const result = await BrandsService.listBrands();

    expect(result).toEqual([
      { id: 'b1', name: 'Apple', slug: 'apple', logo: 'apple.png' },
      { id: 'b2', name: 'Sony', slug: 'sony' },
    ]);
    expect(result[1]).not.toHaveProperty('logo');
    expect(mockRedis.setex).toHaveBeenCalledWith('cache:brands', 3600, expect.any(String));
  });

  it('serves cached brands without querying the DB', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify([{ id: 'b1', name: 'Apple', slug: 'apple' }])
    );

    const result = await BrandsService.listBrands();

    expect(result).toEqual([{ id: 'b1', name: 'Apple', slug: 'apple' }]);
    expect(mockBrand.findMany).not.toHaveBeenCalled();
  });
});
