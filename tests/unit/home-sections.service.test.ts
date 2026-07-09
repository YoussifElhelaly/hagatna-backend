import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    homeSection: { findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock('@database/redis/client', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
  RedisKeys: { cache: { homeSections: () => 'cache:home-sections' } },
  TTL: { HOME_SECTIONS: 120 },
}));

import * as HomeSectionsService from '@modules/home-sections/home-sections.service';
import { prisma } from '@database/prisma/client';
import { redis } from '@database/redis/client';

const mockSection = vi.mocked(prisma.homeSection);
const mockRedis = vi.mocked(redis);

describe('HomeSectionsService.getHomeSections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns sections ordered by sortOrder and maps title correctly', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockSection.findMany.mockResolvedValueOnce([
      { key: 'flashDeals', enabled: true, sortOrder: 3, titleEn: 'Flash', titleAr: 'فلاش', itemLimit: 10 },
      { key: 'trustBar', enabled: false, sortOrder: 11, titleEn: null, titleAr: null, itemLimit: null },
    ] as never);

    const result = await HomeSectionsService.getHomeSections();

    expect(mockSection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sortOrder: 'asc' } })
    );
    expect(result[0]).toEqual({
      key: 'flashDeals',
      enabled: true,
      sortOrder: 3,
      title: { en: 'Flash', ar: 'فلاش' },
      itemLimit: 10,
    });
    // both titles null -> title collapses to null
    expect(result[1].title).toBeNull();
    expect(mockRedis.setex).toHaveBeenCalledWith('cache:home-sections', 120, expect.any(String));
  });

  it('serves from cache without hitting the DB', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify([{ key: 'brands', enabled: true, sortOrder: 1, title: null, itemLimit: 20 }])
    );
    const result = await HomeSectionsService.getHomeSections();
    expect(result).toHaveLength(1);
    expect(mockSection.findMany).not.toHaveBeenCalled();
  });
});

describe('HomeSectionsService.updateHomeSections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts each section by key and invalidates the cache', async () => {
    mockSection.upsert.mockResolvedValue({} as never);
    mockSection.findMany.mockResolvedValueOnce([
      { key: 'flashDeals', enabled: false, sortOrder: 5, titleEn: null, titleAr: null, itemLimit: null },
    ] as never);

    const result = await HomeSectionsService.updateHomeSections([
      { key: 'flashDeals', enabled: false, sortOrder: 5 },
    ]);

    expect(mockSection.upsert).toHaveBeenCalledWith({
      where: { key: 'flashDeals' },
      create: { key: 'flashDeals', enabled: false, sortOrder: 5, titleEn: null, titleAr: null, itemLimit: null },
      update: { enabled: false, sortOrder: 5, titleEn: null, titleAr: null, itemLimit: null },
    });
    expect(mockRedis.del).toHaveBeenCalledWith('cache:home-sections');
    expect(result[0].key).toBe('flashDeals');
  });

  it('maps a provided title into titleEn/titleAr columns', async () => {
    mockSection.upsert.mockResolvedValue({} as never);
    mockSection.findMany.mockResolvedValueOnce([] as never);

    await HomeSectionsService.updateHomeSections([
      { key: 'brands', enabled: true, sortOrder: 2, title: { en: 'Brands', ar: 'العلامات' }, itemLimit: 15 },
    ]);

    expect(mockSection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { enabled: true, sortOrder: 2, titleEn: 'Brands', titleAr: 'العلامات', itemLimit: 15 },
      })
    );
  });
});
