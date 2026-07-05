import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type {
  CreateVendorPlanInput,
  UpdateVendorPlanInput,
  VendorPlansListQuery,
} from './vendor-plans.types';
import type { LocalizedString } from '@shared/types';

// ─── Shared select ─────────────────────────────────────────────────────────────
const planSelect = {
  id:          true,
  name:        true,
  description: true,
  maxProducts: true,
  defaultCommissionRate: true,
  isActive:    true,
  sortOrder:   true,
  createdAt:   true,
  updatedAt:   true,
  categories: {
    select: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  _count: {
    select: { vendors: true },
  },
};

// ─── Shape a plan row into a clean response ────────────────────────────────────
const shapePlan = (plan: Awaited<ReturnType<typeof prisma.vendorPlan.findUniqueOrThrow>>) => ({
  ...plan,
  categories: (plan as any).categories?.map((c: any) => c.category) ?? [],
  vendorCount: (plan as any)._count?.vendors ?? 0,
  _count: undefined,
});

// ─────────────────────────────────────────────────────────────────────────────
// listPlans  —  admin (all) or public (active only + for registration dropdown)
// ─────────────────────────────────────────────────────────────────────────────
export const listPlans = async (query: VendorPlansListQuery, adminMode = false) => {
  const { page = 1, limit = 20, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {
    // Public always sees only active plans; admin can filter or see all
    ...(!adminMode ? { isActive: true } : isActive !== undefined ? { isActive } : {}),
    ...(search && {
      OR: [
        { name: { path: ['en'], string_contains: search } },
        { name: { path: ['ar'], string_contains: search } },
      ],
    }),
  };

  const [plans, total] = await Promise.all([
    prisma.vendorPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: planSelect,
    }),
    prisma.vendorPlan.count({ where }),
  ]);

  return {
    plans: plans.map(shapePlan),
    meta: buildPaginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getPlan  —  single plan by id
// ─────────────────────────────────────────────────────────────────────────────
export const getPlan = async (id: string) => {
  const plan = await prisma.vendorPlan.findUnique({
    where: { id },
    select: planSelect,
  });
  if (!plan) throw ApiError.notFound('Vendor plan not found');
  return shapePlan(plan as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// createPlan  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const createPlan = async (input: CreateVendorPlanInput) => {
  // Validate all categories exist
  const categories = await prisma.category.findMany({
    where: { id: { in: input.categoryIds }, deletedAt: null },
    select: { id: true },
  });
  if (categories.length !== input.categoryIds.length) {
    const foundIds = categories.map((c) => c.id);
    const missing  = input.categoryIds.filter((id) => !foundIds.includes(id));
    throw ApiError.badRequest(`Category(ies) not found: ${missing.join(', ')}`);
  }

  const plan = await prisma.vendorPlan.create({
    data: {
      name:        input.name as never,
      description: input.description ? (input.description as never) : undefined,
      maxProducts: input.maxProducts ?? null,
      defaultCommissionRate: input.defaultCommissionRate ?? null,
      isActive:    input.isActive ?? true,
      sortOrder:   input.sortOrder ?? 0,
      categories: {
        create: input.categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
    select: planSelect,
  });

  return shapePlan(plan as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// updatePlan  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const updatePlan = async (id: string, input: UpdateVendorPlanInput) => {
  const existing = await prisma.vendorPlan.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Vendor plan not found');

  // Validate new categories if provided
  if (input.categoryIds) {
    const categories = await prisma.category.findMany({
      where: { id: { in: input.categoryIds }, deletedAt: null },
      select: { id: true },
    });
    if (categories.length !== input.categoryIds.length) {
      const foundIds = categories.map((c) => c.id);
      const missing  = input.categoryIds.filter((cId) => !foundIds.includes(cId));
      throw ApiError.badRequest(`Category(ies) not found: ${missing.join(', ')}`);
    }
  }

  const plan = await prisma.$transaction(async (tx) => {
    // Replace categories if provided (delete-then-create for simplicity)
    if (input.categoryIds) {
      await tx.vendorPlanCategory.deleteMany({ where: { planId: id } });
      await tx.vendorPlanCategory.createMany({
        data: input.categoryIds.map((categoryId) => ({ planId: id, categoryId })),
      });
    }

    return tx.vendorPlan.update({
      where: { id },
      data: {
        ...(input.name        && { name:        input.name as never }),
        ...(input.description && { description: input.description as never }),
        ...(input.maxProducts !== undefined && { maxProducts: input.maxProducts }),
        ...(input.defaultCommissionRate !== undefined && { defaultCommissionRate: input.defaultCommissionRate }),
        ...(input.isActive    !== undefined && { isActive:    input.isActive }),
        ...(input.sortOrder   !== undefined && { sortOrder:   input.sortOrder }),
      },
      select: planSelect,
    });
  });

  return shapePlan(plan as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// deletePlan  (admin) — only if no vendors are on it
// ─────────────────────────────────────────────────────────────────────────────
export const deletePlan = async (id: string) => {
  const plan = await prisma.vendorPlan.findUnique({
    where: { id },
    select: { id: true, _count: { select: { vendors: true } } },
  });
  if (!plan) throw ApiError.notFound('Vendor plan not found');

  if (plan._count.vendors > 0) {
    throw ApiError.conflict(
      `Cannot delete: ${plan._count.vendors} vendor(s) are on this plan. ` +
      `Deactivate it instead or migrate vendors to another plan first.`,
    );
  }

  await prisma.vendorPlan.delete({ where: { id } });
};

// ─────────────────────────────────────────────────────────────────────────────
// getVendorsOnPlan  (admin) — list vendors subscribed to a plan
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorsOnPlan = async (planId: string, page = 1, limit = 20) => {
  const plan = await prisma.vendorPlan.findUnique({ where: { id: planId } });
  if (!plan) throw ApiError.notFound('Vendor plan not found');

  const skip = (page - 1) * limit;

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      where:   { planId },
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:             true,
        storeName:      true,
        storeSlug:      true,
        mediaAssets:    { where: { folder: 'vendors/logos' }, select: { url: true, id: true }, take: 1 },
        status:         true,
        commissionRate: true,
        verifiedAt:     true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.vendorProfile.count({ where: { planId } }),
  ]);

  return { vendors, meta: buildPaginationMeta(total, page, limit) };
};
