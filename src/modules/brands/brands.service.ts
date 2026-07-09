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
    where: { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, logo: true, isActive: true, sortOrder: true },
  });

  const brands: BrandDTO[] = rows.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    ...(b.logo ? { logo: b.logo } : {}),
  }));

  await redis.setex(cacheKey, TTL.BRANDS, JSON.stringify(brands));
  return brands;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin CRUD Methods
// ─────────────────────────────────────────────────────────────────────────────

export const listAllBrandsForAdmin = async () => {
  const rows = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, logo: true, isActive: true, sortOrder: true, createdAt: true },
  });
  return rows;
};

export const createBrand = async (data: { name: string; slug: string; logo?: string; isActive?: boolean; sortOrder?: number }) => {
  const newBrand = await prisma.brand.create({ data });
  await redis.del(RedisKeys.cache.brands());
  return newBrand;
};

export const updateBrand = async (id: string, data: { name?: string; slug?: string; logo?: string; isActive?: boolean; sortOrder?: number }) => {
  const updatedBrand = await prisma.brand.update({
    where: { id },
    data,
  });
  await redis.del(RedisKeys.cache.brands());
  return updatedBrand;
};

export const deleteBrand = async (id: string) => {
  await prisma.brand.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await redis.del(RedisKeys.cache.brands());
  return { id };
};
