import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';
import { ApiError } from '@shared/utils/ApiError';
import { generateUniqueSlug } from '@shared/utils/generateSlug';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.types';

// ─── Shared select ────────────────────────────────────────────────────────────
const categorySelect = {
  id: true,
  parentId: true,
  name: true,
  description: true,
  slug: true,
  image: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// listCategories  —  full active tree, Redis-cached for 1 hour
// ─────────────────────────────────────────────────────────────────────────────
export const listCategories = async () => {
  const cacheKey = RedisKeys.cache.categories();

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch all active top-level categories with their children (2 levels deep)
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null, deletedAt: null },
    select: {
      ...categorySelect,
      children: {
        where: { isActive: true, deletedAt: null },
        select: {
          ...categorySelect,
          children: {
            where: { isActive: true, deletedAt: null },
            select: categorySelect,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  // Cache for 1 hour
  await redis.setex(cacheKey, TTL.CATEGORIES, JSON.stringify(categories));

  return categories;
};

// ─────────────────────────────────────────────────────────────────────────────
// getCategoryBySlug  —  single category with product count (public)
// ─────────────────────────────────────────────────────────────────────────────
export const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: {
      ...categorySelect,
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true, deletedAt: null },
        select: categorySelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      _count: {
        select: { products: { where: { status: 'active', deletedAt: null } } },
      },
    },
  });

  if (!category) throw ApiError.notFound('Category not found');
  if (!category.isActive) throw ApiError.notFound('Category not found');

  return category;
};

// ─────────────────────────────────────────────────────────────────────────────
// createCategory  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const createCategory = async (input: CreateCategoryInput) => {
  // Validate parent exists if provided
  if (input.parentId) {
    const parent = await prisma.category.findFirst({ where: { id: input.parentId, deletedAt: null } });
    if (!parent) throw ApiError.notFound('Parent category not found');
  }

  const slug = await generateUniqueSlug(input.name.en, 'category');

  const category = await prisma.category.create({
    data: { ...input, slug },
    select: categorySelect,
  });

  // Invalidate tree cache
  await redis.del(RedisKeys.cache.categories());

  return category;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateCategory  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const updateCategory = async (categoryId: string, input: UpdateCategoryInput) => {
  const existing = await prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Category not found');

  // Prevent circular parent assignment
  if (input.parentId === categoryId) {
    throw ApiError.badRequest('A category cannot be its own parent');
  }

  // Validate parent exists if being changed
  if (input.parentId) {
    const parent = await prisma.category.findFirst({ where: { id: input.parentId, deletedAt: null } });
    if (!parent) throw ApiError.notFound('Parent category not found');
  }

  // Regenerate slug if English name changed
  let slug = existing.slug;
  const newNameEn = input.name?.en;
  if (newNameEn && newNameEn !== (existing.name as { en: string }).en) {
    slug = await generateUniqueSlug(newNameEn, 'category', categoryId);
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: { ...input, slug },
    select: categorySelect,
  });

  // Invalidate tree cache
  await redis.del(RedisKeys.cache.categories());

  return category;
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteCategory  (admin)  — soft delete, blocked if active products exist
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCategory = async (categoryId: string) => {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
    include: {
      _count: {
        select: {
          products: { where: { deletedAt: null } },
          children: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!existing) throw ApiError.notFound('Category not found');

  if (existing._count.products > 0) {
    throw ApiError.conflict(
      `Cannot delete: this category has ${existing._count.products} product(s). Reassign or remove them first.`
    );
  }

  if (existing._count.children > 0) {
    throw ApiError.conflict(
      `Cannot delete: this category has ${existing._count.children} sub-category(ies). Delete or move them first.`
    );
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { deletedAt: new Date() },
  });

  // Invalidate tree cache
  await redis.del(RedisKeys.cache.categories());
};
