import { Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import type { CreatePromoBannerInput, UpdatePromoBannerInput } from './promo-banners.types';

const asJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

// ─── Public shape (home page) ─────────────────────────────────────────────────
const publicSelect = {
  id: true,
  title: true,
  subtitle: true,
  ctaText: true,
  linkUrl: true,
  gradient: true,
  order: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// getActivePromoBanners  —  public, ordered by `order` asc
// ─────────────────────────────────────────────────────────────────────────────
export const getActivePromoBanners = async () => {
  return prisma.promoBanner.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: publicSelect,
  });
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAllPromoBanners = async () => {
  return prisma.promoBanner.findMany({ orderBy: { order: 'asc' } });
};

export const getPromoBannerById = async (id: string) => {
  const banner = await prisma.promoBanner.findUnique({ where: { id } });
  if (!banner) throw ApiError.notFound('Promo banner not found');
  return banner;
};

export const createPromoBanner = async (data: CreatePromoBannerInput) => {
  return prisma.promoBanner.create({
    data: {
      title: asJson(data.title),
      ...(data.subtitle && { subtitle: asJson(data.subtitle) }),
      ...(data.ctaText && { ctaText: asJson(data.ctaText) }),
      linkUrl: data.linkUrl ?? null,
      gradient: data.gradient ?? null,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    },
  });
};

export const updatePromoBanner = async (id: string, data: UpdatePromoBannerInput) => {
  await getPromoBannerById(id);   // 404 if missing
  return prisma.promoBanner.update({
    where: { id },
    data: {
      ...(data.title && { title: asJson(data.title) }),
      ...(data.subtitle && { subtitle: asJson(data.subtitle) }),
      ...(data.ctaText && { ctaText: asJson(data.ctaText) }),
      ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
      ...(data.gradient !== undefined && { gradient: data.gradient }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

export const deletePromoBanner = async (id: string) => {
  await getPromoBannerById(id);   // 404 if missing
  await prisma.promoBanner.delete({ where: { id } });
};
