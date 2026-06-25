import { DiscountType, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type {
  CreatePromotionInput,
  UpdatePromotionInput,
  PromotionsListQuery,
  ValidateCouponQuery,
} from './promotions.types';

// ─── Shared select ────────────────────────────────────────────────────────────
const promotionSelect = {
  id: true,
  name: true,
  type: true,
  code: true,
  discountType: true,
  discountValue: true,
  minPurchaseAmount: true,
  maxDiscountAmount: true,
  usageLimitTotal: true,
  usageLimitPerUser: true,
  usageCount: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  createdAt: true,
  vendor: { select: { id: true, storeName: true, storeSlug: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// listPromotions  —  admin sees all, vendor sees own
// ─────────────────────────────────────────────────────────────────────────────
export const listPromotions = async (
  query: PromotionsListQuery,
  scopeVendorId?: string   // if set, filters to this vendor only
) => {
  const { page = 1, limit = 20, type, isActive, vendorId, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PromotionWhereInput = {
    deletedAt: null,
    ...(scopeVendorId ? { vendorId: scopeVendorId } : vendorId ? { vendorId } : {}),
    ...(type && { type }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { path: ['en'], string_contains: search } },
        { name: { path: ['ar'], string_contains: search } },
      ],
    }),
  };

  const [promotions, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...promotionSelect,
        _count: { select: { usages: true } },
      },
    }),
    prisma.promotion.count({ where }),
  ]);

  return { promotions, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getPromotion  —  detail with usage stats
// ─────────────────────────────────────────────────────────────────────────────
export const getPromotion = async (
  promotionId: string,
  scopeVendorId?: string
) => {
  const promotion = await prisma.promotion.findFirst({
    where: { id: promotionId, deletedAt: null },
    select: {
      ...promotionSelect,
      _count: { select: { usages: true } },
      usages: {
        take: 5,
        orderBy: { usedAt: 'desc' },
        select: {
          id: true,
          discountApplied: true,
          usedAt: true,
          user: { select: { id: true, name: true, email: true } },
          order: { select: { orderNumber: true } },
        },
      },
    },
  });

  if (!promotion) throw ApiError.notFound('Promotion not found');

  // Vendor can only access their own promotions
  if (scopeVendorId && promotion.vendor?.id !== scopeVendorId) {
    throw ApiError.forbidden('Access denied');
  }

  return promotion;
};

// ─────────────────────────────────────────────────────────────────────────────
// createPromotion  —  admin creates platform-wide; vendor creates store-scoped
// ─────────────────────────────────────────────────────────────────────────────
export const createPromotion = async (
  input: CreatePromotionInput,
  actorVendorId?: string   // if set, forces vendorId = actor's vendor
) => {
  // Resolve vendorId: vendor actors can only create for themselves
  const resolvedVendorId = actorVendorId ?? input.vendorId ?? null;

  // If admin is assigning to a vendor, confirm vendor exists
  if (resolvedVendorId && !actorVendorId) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: resolvedVendorId } });
    if (!vendor) throw ApiError.notFound('Vendor not found');
  }

  // Code uniqueness — exclude soft-deleted promos to allow code reuse
  if (input.code) {
    const existing = await prisma.promotion.findFirst({ where: { code: input.code, deletedAt: null } });
    if (existing) throw ApiError.conflict(`Coupon code "${input.code}" is already in use`);
  }

  return prisma.promotion.create({
    data: {
      ...input,
      vendorId: resolvedVendorId,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    },
    select: promotionSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// updatePromotion  —  cannot change type, code, or discountType after creation
// ─────────────────────────────────────────────────────────────────────────────
export const updatePromotion = async (
  promotionId: string,
  input: UpdatePromotionInput,
  scopeVendorId?: string
) => {
  const promotion = await prisma.promotion.findFirst({ where: { id: promotionId, deletedAt: null } });
  if (!promotion) throw ApiError.notFound('Promotion not found');

  if (scopeVendorId && promotion.vendorId !== scopeVendorId) {
    throw ApiError.forbidden('Access denied');
  }

  // Cannot edit a promotion that has already been used
  if (promotion.usageCount > 0 && input.discountValue !== undefined) {
    throw ApiError.conflict(
      'Cannot change the discount value of a promotion that has already been used'
    );
  }

  return prisma.promotion.update({
    where: { id: promotionId },
    data: {
      ...input,
      ...(input.startsAt && { startsAt: new Date(input.startsAt) }),
      ...(input.endsAt !== undefined && {
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      }),
    },
    select: promotionSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// deletePromotion  —  always soft delete (preserve order history integrity)
// ─────────────────────────────────────────────────────────────────────────────
export const deletePromotion = async (promotionId: string, scopeVendorId?: string) => {
  const promotion = await prisma.promotion.findFirst({ where: { id: promotionId, deletedAt: null } });
  if (!promotion) throw ApiError.notFound('Promotion not found');

  if (scopeVendorId && promotion.vendorId !== scopeVendorId) {
    throw ApiError.forbidden('Access denied');
  }

  await prisma.promotion.update({
    where: { id: promotionId },
    data: { deletedAt: new Date(), isActive: false },
  });

  return { deleted: true, message: 'Promotion deleted' };
};

// ─────────────────────────────────────────────────────────────────────────────
// validateCoupon  —  authenticated endpoint for cart page preview
// ─────────────────────────────────────────────────────────────────────────────
export const validateCoupon = async (
  userId: string,
  query: ValidateCouponQuery
) => {
  const { code, subtotal = 0 } = query;

  const promo = await prisma.promotion.findFirst({ where: { code, deletedAt: null } });

  if (!promo || !promo.isActive) {
    throw ApiError.badRequest('Invalid or expired coupon code');
  }

  const now = new Date();
  if (promo.startsAt > now) throw ApiError.badRequest('This coupon is not yet active');
  if (promo.endsAt && promo.endsAt < now) throw ApiError.badRequest('This coupon has expired');

  if (promo.usageLimitTotal && promo.usageCount >= promo.usageLimitTotal) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }

  if (subtotal < Number(promo.minPurchaseAmount)) {
    throw ApiError.badRequest(
      `Minimum purchase of ${promo.minPurchaseAmount} required for this coupon`
    );
  }

  // Per-user usage
  const userUsage = await prisma.couponUsage.count({
    where: { promotionId: promo.id, userId },
  });
  if (userUsage >= promo.usageLimitPerUser) {
    throw ApiError.badRequest('You have already used this coupon the maximum number of times');
  }

  // Compute discount
  let discountAmount: number;
  if (promo.discountType === DiscountType.percentage) {
    discountAmount = (Number(promo.discountValue) / 100) * subtotal;
    if (promo.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, Number(promo.maxDiscountAmount));
    }
  } else {
    discountAmount = Math.min(Number(promo.discountValue), subtotal);
  }
  discountAmount = Number(discountAmount.toFixed(2));

  return {
    valid: true,
    promotionId: promo.id,
    code: promo.code,
    name: promo.name,
    discountType: promo.discountType,
    discountValue: Number(promo.discountValue),
    discountAmount,
    finalTotal: Number((subtotal - discountAmount).toFixed(2)),
    minPurchaseAmount: Number(promo.minPurchaseAmount),
    maxDiscountAmount: promo.maxDiscountAmount ? Number(promo.maxDiscountAmount) : null,
  };
};
