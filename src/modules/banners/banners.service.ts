import { PrismaClient, Prisma } from '@prisma/client';
import { BannerData, UpdateBannerInput } from './banners.types';

const prisma = new PrismaClient();

export async function createBanner(data: BannerData) {
  return prisma.banner.create({
    data: {
      title: data.title as unknown as Prisma.InputJsonValue,
      description: data.description as unknown as Prisma.InputJsonValue,
      imageUrl: data.imageUrl,
      imagePublicId: data.imagePublicId,
      linkUrl: data.linkUrl,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
}

export async function getActiveBanners() {
  const now = new Date();

  return prisma.banner.findMany({
    where: {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      linkUrl: true,
      order: true,
    },
  });
}

export async function getAllBanners() {
  return prisma.banner.findMany({
    orderBy: { order: 'asc' },
  });
}

export async function getBannerById(id: string) {
  return prisma.banner.findUnique({ where: { id } });
}

export async function updateBanner(id: string, data: UpdateBannerInput) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    throw new Error('Banner not found');
  }

  return prisma.banner.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title as unknown as Prisma.InputJsonValue }),
      ...(data.description && { description: data.description as unknown as Prisma.InputJsonValue }),
      ...(data.imageUrl && { imageUrl: data.imageUrl }),
      ...(data.imagePublicId && { imagePublicId: data.imagePublicId }),
      ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.startDate !== undefined && {
        startDate: data.startDate ? new Date(data.startDate) : null,
      }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
    },
  });
}

export async function deleteBanner(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    throw new Error('Banner not found');
  }

  return prisma.banner.delete({ where: { id } });
}

export async function toggleBannerActive(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    throw new Error('Banner not found');
  }

  return prisma.banner.update({
    where: { id },
    data: { isActive: !banner.isActive },
  });
}

export async function reorderBanners(bannerIds: string[]) {
  const updates = bannerIds.map((id, index) =>
    prisma.banner.update({
      where: { id },
      data: { order: index },
    })
  );

  return prisma.$transaction(updates);
}
