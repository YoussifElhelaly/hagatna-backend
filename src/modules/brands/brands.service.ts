import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';

export interface BrandDTO {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// listBrands  —  public, active brands, cached ~1 hour
// ─────────────────────────────────────────────────────────────────────────────
export const listBrands = async (): Promise<BrandDTO[]> => {
  const cacheKey = RedisKeys.cache.brands();
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as BrandDTO[];

  const rows = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, logo: true },
  });

  // Omit logo entirely when null so the payload matches the documented shape
  const brands: BrandDTO[] = rows.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    ...(b.logo ? { logo: b.logo } : {}),
  }));

  await redis.setex(cacheKey, TTL.BRANDS, JSON.stringify(brands));
  return brands;
};
