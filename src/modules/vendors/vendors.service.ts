import { VendorStatus, Role, OrderStatus, PaymentStatus, ProductStatus, ReviewStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { generateUniqueSlug } from '@shared/utils/generateSlug';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import { notify } from '@modules/notifications/notifications.service';
import type {
  OnboardVendorInput,
  UpdateVendorProfileInput,
  VendorsListQuery,
  VendorStats,
} from './vendors.types';

// ─── Vendor profile select (safe fields only) ─────────────────────────────────
const vendorSelect = {
  id:             true,
  storeName:      true,
  description:    true,
  storeSlug:      true,
  address:                      true,
  city:                         true,
  country:                      true,
  phone:                        true,
  secondaryPhone:               true,
  taxCardNumber:                true,
  commercialRegistrationNumber: true,
  commissionRate:               true,
  status:         true,
  verifiedAt:     true,
  createdAt:      true,
  user: {
    select: { id: true, name: true, email: true, phone: true, avatar: true },
  },
  plan: {
    select: {
      id:          true,
      name:        true,
      maxProducts: true,
      categories: {
        select: { category: { select: { id: true, name: true, slug: true } } },
      },
    },
  },
  _count: {
    select: { products: true },
  },
};

const shapeVendor = (vendor: Record<string, any>) => ({
  ...vendor,
  plan: vendor.plan
    ? { ...vendor.plan, categories: vendor.plan.categories?.map((c: any) => c.category) ?? [] }
    : null,
  productCount: vendor._count?.products ?? 0,
  _count: undefined,
});

// ─────────────────────────────────────────────────────────────────────────────
// onboard  —  any verified user can apply to become a vendor
// ─────────────────────────────────────────────────────────────────────────────
export const onboard = async (userId: string, input: OnboardVendorInput) => {
  // Validate plan exists and is active
  const plan = await prisma.vendorPlan.findUnique({
    where:  { id: input.planId },
    select: { id: true, isActive: true },
  });
  if (!plan)          throw ApiError.notFound('Vendor plan not found');
  if (!plan.isActive) throw ApiError.badRequest('This vendor plan is no longer available');

  // One application per user
  const existing = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (existing) {
    if (existing.status === VendorStatus.approved) {
      throw ApiError.conflict('You already have an approved vendor account');
    }
    if (existing.status === VendorStatus.pending) {
      throw ApiError.conflict('Your vendor application is already under review');
    }
    // Rejected → allow reapplication by updating
    const storeSlug = await generateUniqueSlug(
      input.storeName.en,
      'vendorProfile',
      existing.id,
    );
    const { planId, ...rest } = input;
    const updated = await prisma.vendorProfile.update({
      where: { userId },
      data:  { ...rest, planId, storeSlug, status: VendorStatus.pending, rejectionReason: null },
      select: vendorSelect,
    });
    return shapeVendor(updated as any);
  }

  const storeSlug = await generateUniqueSlug(input.storeName.en, 'vendorProfile');
  const { planId, ...rest } = input;

  const created = await prisma.vendorProfile.create({
    data: { ...rest, planId, userId, storeSlug },
    select: vendorSelect,
  });
  return shapeVendor(created as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// getMyProfile
// ─────────────────────────────────────────────────────────────────────────────
export const getMyProfile = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorSelect,
  });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');
  return shapeVendor(vendor as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// updateMyProfile
// ─────────────────────────────────────────────────────────────────────────────
export const updateMyProfile = async (userId: string, input: UpdateVendorProfileInput) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');
  if (vendor.status !== VendorStatus.approved) {
    throw ApiError.forbidden('Only approved vendors can update their profile');
  }

  // Regenerate slug if store name changed
  let storeSlug = vendor.storeSlug;
  if (input.storeName?.en && input.storeName.en !== (vendor.storeName as { en: string }).en) {
    storeSlug = await generateUniqueSlug(input.storeName.en, 'vendorProfile', vendor.id);
  }

  const updated = await prisma.vendorProfile.update({
    where: { userId },
    data: { ...input, storeSlug },
    select: vendorSelect,
  });
  return shapeVendor(updated as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// getMyStats  —  vendor dashboard numbers
// ─────────────────────────────────────────────────────────────────────────────
export const getMyStats = async (userId: string): Promise<VendorStats> => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const vendorId = vendor.id;

  const [
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    revenueAgg,
    pendingCommissionAgg,
    reviewStats,
  ] = await Promise.all([
    prisma.product.count({ where: { vendorId } }),
    prisma.product.count({ where: { vendorId, status: ProductStatus.active } }),
    prisma.orderItem.count({ where: { vendorId } }),
    prisma.orderItem.count({ where: { vendorId, status: OrderStatus.pending } }),
    prisma.orderItem.aggregate({
      where: { vendorId, order: { paymentStatus: PaymentStatus.completed } },
      _sum: { subtotal: true },
    }),
    prisma.vendorCommission.aggregate({
      where: { vendorId, status: PaymentStatus.pending },
      _sum: { commissionAmount: true },
    }),
    prisma.review.aggregate({
      where: { vendorId, status: ReviewStatus.approved },
      _count: { id: true },
      _avg: { rating: true },
    }),
  ]);

  return {
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    totalRevenue: Number(revenueAgg._sum.subtotal ?? 0),
    pendingCommission: Number(pendingCommissionAgg._sum.commissionAmount ?? 0),
    totalReviews: reviewStats._count.id,
    averageRating: Number((reviewStats._avg.rating ?? 0).toFixed(1)),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getVendorStatsById  —  admin: get any vendor's stats by vendorId
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorStatsById = async (vendorId: string): Promise<VendorStats> => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const [
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    revenueAgg,
    pendingCommissionAgg,
    reviewStats,
  ] = await Promise.all([
    prisma.product.count({ where: { vendorId } }),
    prisma.product.count({ where: { vendorId, status: ProductStatus.active } }),
    prisma.orderItem.count({ where: { vendorId } }),
    prisma.orderItem.count({ where: { vendorId, status: OrderStatus.pending } }),
    prisma.orderItem.aggregate({
      where: { vendorId, order: { paymentStatus: PaymentStatus.completed } },
      _sum: { subtotal: true },
    }),
    prisma.vendorCommission.aggregate({
      where: { vendorId, status: PaymentStatus.pending },
      _sum: { commissionAmount: true },
    }),
    prisma.review.aggregate({
      where: { vendorId, status: ReviewStatus.approved },
      _count: { id: true },
      _avg: { rating: true },
    }),
  ]);

  return {
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    totalRevenue: Number(revenueAgg._sum.subtotal ?? 0),
    pendingCommission: Number(pendingCommissionAgg._sum.commissionAmount ?? 0),
    totalReviews: reviewStats._count.id,
    averageRating: Number((reviewStats._avg.rating ?? 0).toFixed(1)),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getPublicProfile  (by slug, public route)
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicProfile = async (slug: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { storeSlug: slug },
    select: {
      id: true,
      storeName: true,
      description: true,
      storeSlug: true,
      city: true,
      country: true,
      verifiedAt: true,
      createdAt: true,
      _count: {
        select: {
          products: { where: { status: ProductStatus.active } },
          reviews: { where: { status: ReviewStatus.approved } },
        },
      },
    },
  });

  if (!vendor || vendor === null) throw ApiError.notFound('Store not found');
  return vendor;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — getVendorById
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorById = async (vendorId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where:  { id: vendorId },
    select: { ...vendorSelect, rejectionReason: true },
  });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  const { rejectionReason, ...rest } = vendor as any;
  return { ...shapeVendor(rest), rejectionReason };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — listVendors
// ─────────────────────────────────────────────────────────────────────────────
export const listVendors = async (query: VendorsListQuery) => {
  const { page = 1, limit = 20, status, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { storeSlug:  { contains: search, mode: 'insensitive' as const } },
        { storeName:  { path: ['en'], string_contains: search } },
        { storeName:  { path: ['ar'], string_contains: search } },
        { user: { name:  { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { user: { phone: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      where,
      skip,
      take: limit,
      select: {
        ...vendorSelect,
        rejectionReason: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vendorProfile.count({ where }),
  ]);

  return {
    vendors: vendors.map((v: any) => {
      const { rejectionReason, ...rest } = v;
      return { ...shapeVendor(rest), rejectionReason };
    }),
    meta: buildPaginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — approveVendor
// ─────────────────────────────────────────────────────────────────────────────
export const approveVendor = async (vendorId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  if (vendor.status === VendorStatus.approved) {
    throw ApiError.conflict('Vendor is already approved');
  }

  // Approve profile + upgrade user role in one transaction
  const [updatedVendor] = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.approved,
        rejectionReason: null,
        verifiedAt: new Date(),
      },
      select: vendorSelect,
    }),
    prisma.user.update({
      where: { id: vendor.userId },
      data: { role: Role.vendor },
    }),
  ]);

  // Notify the vendor owner
  notify.vendorApproved(vendor.userId, (updatedVendor.storeName as { en: string }).en);

  return shapeVendor(updatedVendor as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — rejectVendor
// ─────────────────────────────────────────────────────────────────────────────
export const rejectVendor = async (vendorId: string, rejectionReason: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  if (vendor.status === VendorStatus.approved) {
    throw ApiError.conflict('Cannot reject an already approved vendor');
  }

  const updated = await prisma.vendorProfile.update({
    where: { id: vendorId },
    data: { status: VendorStatus.rejected, rejectionReason },
    select: { ...vendorSelect, rejectionReason: true },
  });
  const { rejectionReason: reason, ...vendorData } = updated as any;
  return { ...shapeVendor(vendorData), rejectionReason: reason };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — suspendVendor
// ─────────────────────────────────────────────────────────────────────────────
export const suspendVendor = async (vendorId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    include: { user: { select: { id: true } } },
  });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  // Suspend vendor profile + deactivate user account in one transaction
  const [updatedVendor] = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { status: VendorStatus.suspended },
      select: vendorSelect,
    }),
    prisma.user.update({
      where: { id: vendor.userId },
      data: { isActive: false, refreshToken: null },
    }),
  ]);

  return shapeVendor(updatedVendor as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — updateCommission
// ─────────────────────────────────────────────────────────────────────────────
export const updateCommission = async (vendorId: string, commissionRate: number) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  return prisma.vendorProfile.update({
    where: { id: vendorId },
    data: { commissionRate },
    select: { id: true, storeName: true, storeSlug: true, commissionRate: true },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor — getMyEarnings
// Summary: gross sales, commission deducted, net earnings, paid vs pending
// ─────────────────────────────────────────────────────────────────────────────
export const getMyEarnings = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const [totalGrossAgg, totalPaidAgg, totalPendingAgg] = await Promise.all([
    // All-time gross + commission
    prisma.vendorCommission.aggregate({
      where: { vendorId: vendor.id },
      _sum: { grossAmount: true, commissionAmount: true, netAmount: true },
      _count: { id: true },
    }),
    // Already paid out
    prisma.vendorCommission.aggregate({
      where: { vendorId: vendor.id, status: PaymentStatus.completed },
      _sum: { netAmount: true },
    }),
    // Pending payout
    prisma.vendorCommission.aggregate({
      where: { vendorId: vendor.id, status: PaymentStatus.pending },
      _sum: { netAmount: true },
    }),
  ]);

  return {
    totalOrders:    totalGrossAgg._count.id,
    totalGross:     Number(totalGrossAgg._sum.grossAmount      ?? 0),
    totalCommission: Number(totalGrossAgg._sum.commissionAmount ?? 0),
    totalNet:       Number(totalGrossAgg._sum.netAmount        ?? 0),
    totalPaid:      Number(totalPaidAgg._sum.netAmount         ?? 0),
    totalPending:   Number(totalPendingAgg._sum.netAmount      ?? 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor — getMyPayoutHistory
// Paginated list of commission records for this vendor
// ─────────────────────────────────────────────────────────────────────────────
export const getMyPayoutHistory = async (
  userId: string,
  query: { page?: number; limit?: number; status?: PaymentStatus }
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where = {
    vendorId: vendor.id,
    ...(status && { status }),
  };

  const [records, total] = await Promise.all([
    prisma.vendorCommission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        grossAmount: true,
        commissionRate: true,
        commissionAmount: true,
        netAmount: true,
        status: true,
        paidAt: true,
        createdAt: true,
        order: { select: { orderNumber: true, createdAt: true } },
        orderItem: {
          select: {
            quantity: true,
            unitPrice: true,
            productSnapshot: true,
          },
        },
      },
    }),
    prisma.vendorCommission.count({ where }),
  ]);

  return { records, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — getVendorProducts  (paginated product list for a specific vendor)
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorProducts = async (
  vendorId: string,
  query: { page?: number; limit?: number; status?: string }
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where = {
    vendorId,
    deletedAt: null as null,
    ...(status && { status: status as any }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, slug: true, price: true, stockQuantity: true,
        status: true, isFeatured: true, createdAt: true,
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
        category: { select: { id: true, name: true } },
        _count: { select: { reviews: true, orderItems: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — getVendorOrders  (paginated orders containing items from this vendor)
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorOrders = async (
  vendorId: string,
  query: { page?: number; limit?: number; status?: string }
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where = {
    items: { some: { vendorId } },
    ...(status && { status: status as any }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, orderNumber: true, status: true, paymentStatus: true,
        total: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          where: { vendorId },
          select: {
            id: true, quantity: true, unitPrice: true, subtotal: true,
            status: true, productSnapshot: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor — getMyAnalyticsOverview
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAnalyticsOverview = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const [
    ordersAgg,
    pendingOrders,
    netEarningsAgg,
    productsCount,
    pendingProductsCount,
    reviewsAgg,
    returnsCount,
  ] = await Promise.all([
    // Total orders & gross revenue
    prisma.vendorCommission.aggregate({
      where: { vendorId: vendor.id, order: { paymentStatus: PaymentStatus.completed } },
      _sum: { grossAmount: true, netAmount: true },
      _count: { id: true },
    }),
    // Pending orders count
    prisma.orderItem.count({
      where: {
        vendorId: vendor.id,
        order: { status: OrderStatus.pending },
      },
    }),
    // Pending payout (money owed to vendor)
    prisma.vendorCommission.aggregate({
      where: { vendorId: vendor.id, status: PaymentStatus.pending },
      _sum: { netAmount: true },
    }),
    // Active products
    prisma.product.count({
      where: { vendorId: vendor.id, deletedAt: null, status: ProductStatus.active },
    }),
    // Products awaiting approval
    prisma.product.count({
      where: { vendorId: vendor.id, deletedAt: null, status: ProductStatus.pending_approval },
    }),
    // Review stats
    prisma.review.aggregate({
      where: { product: { vendorId: vendor.id }, deletedAt: null },
      _avg: { rating: true },
      _count: { id: true },
    }),
    // Return requests
    prisma.refund.count({
      where: { order: { items: { some: { vendorId: vendor.id } } } },
    }),
  ]);

  const totalGross = Number(ordersAgg._sum.grossAmount ?? 0);
  const totalNet   = Number(ordersAgg._sum.netAmount   ?? 0);

  return {
    totalOrders:       ordersAgg._count.id,
    totalGrossRevenue: totalGross,
    totalNetRevenue:   totalNet,
    pendingPayout:     Number(netEarningsAgg._sum.netAmount ?? 0),
    pendingOrders,
    activeProducts:    productsCount,
    pendingProducts:   pendingProductsCount,
    averageRating:     reviewsAgg._avg.rating ? Number(reviewsAgg._avg.rating.toFixed(2)) : null,
    totalReviews:      reviewsAgg._count.id,
    totalReturns:      returnsCount,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor — getMyAnalyticsRevenue
// Daily revenue + order count in a date range
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAnalyticsRevenue = async (
  userId: string,
  from?: string,
  to?: string,
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate   = to   ? new Date(to)   : new Date();

  const rows = await prisma.$queryRaw<{ date: Date; revenue: number; orders: bigint }[]>`
    SELECT
      DATE_TRUNC('day', o."createdAt")  AS date,
      SUM(vc."grossAmount")::float       AS revenue,
      COUNT(vc.id)                       AS orders
    FROM vendor_commissions vc
    JOIN orders o ON o.id = vc."orderId"
    WHERE vc."vendorId"     = ${vendor.id}
      AND o."paymentStatus" = 'completed'
      AND o."createdAt"    >= ${fromDate}
      AND o."createdAt"    <= ${toDate}
    GROUP BY DATE_TRUNC('day', o."createdAt")
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date:    r.date,
    revenue: Number(r.revenue),
    orders:  Number(r.orders),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor — getMyTopProducts
// ─────────────────────────────────────────────────────────────────────────────
export const getMyTopProducts = async (userId: string, limit = 10) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const rows = await prisma.orderItem.groupBy({
    by:       ['productId'],
    where:    { vendorId: vendor.id },
    _count:   { id: true },
    _sum:     { subtotal: true },
    orderBy:  { _count: { id: 'desc' } },
    take:     limit,
  });

  if (!rows.length) return [];

  const productIds = rows.map((r) => r.productId);
  const products   = await prisma.product.findMany({
    where:  { id: { in: productIds }, deletedAt: null },
    select: {
      id:     true,
      name:   true,
      slug:   true,
      price:  true,
      images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  return rows.map((r) => ({
    product:      productMap.get(r.productId) ?? null,
    totalOrders:  r._count.id,
    totalRevenue: Number(r._sum.subtotal ?? 0),
  }));
};
