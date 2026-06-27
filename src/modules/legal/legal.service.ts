import { Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { LegalPageData, UpdateLegalPageInput } from './legal.types';

export async function createLegalPage(data: LegalPageData) {
  const existing = await prisma.legalPage.findUnique({
    where: { type_audience: { type: data.type, audience: data.audience } },
  });

  if (existing) {
    throw new Error(`A ${data.type} page for ${data.audience} already exists`);
  }

  return prisma.legalPage.create({
    data: {
      type: data.type,
      audience: data.audience,
      title: data.title as unknown as Prisma.InputJsonValue,
      content: data.content as unknown as Prisma.InputJsonValue,
      slug: data.slug,
      isActive: data.isActive ?? true,
    },
  });
}

export async function getLegalPage(type: string, audience: string) {
  return prisma.legalPage.findUnique({
    where: { type_audience: { type, audience } },
  });
}

export async function getLegalPageById(id: string) {
  return prisma.legalPage.findUnique({ where: { id } });
}

export async function getAllLegalPages() {
  return prisma.legalPage.findMany({
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateLegalPage(id: string, data: UpdateLegalPageInput) {
  const page = await prisma.legalPage.findUnique({ where: { id } });
  if (!page) {
    throw new Error('Legal page not found');
  }

  if (data.slug && data.slug !== page.slug) {
    const existingSlug = await prisma.legalPage.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (existingSlug) {
      throw new Error('Slug already in use');
    }
  }

  return prisma.legalPage.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title as unknown as Prisma.InputJsonValue }),
      ...(data.content && { content: data.content as unknown as Prisma.InputJsonValue }),
      ...(data.slug && { slug: data.slug }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteLegalPage(id: string) {
  const page = await prisma.legalPage.findUnique({ where: { id } });
  if (!page) {
    throw new Error('Legal page not found');
  }

  return prisma.legalPage.delete({ where: { id } });
}
