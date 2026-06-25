import { OrderStatus, PaymentStatus, VendorStatus, ProductStatus, ReviewStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';

// ─────────────────────────────────────────────────────────────────────────────
// overview  —  high-level dashboard KPIs
// ─────────────────────────────────────────────────────────────────────────────
export const getOverview = async () => {
  const [
    revenueAgg,
    totalPlatformIncome,
    totalOrders,
    completedOrders,
    pendingOrders,
    totalUsers,
    totalVendors,
    totalProducts,
    pendingProducts,
    totalReviews,
    pendingReviews,
    totalReturns,
    pendingReturns,
    activeCarts,
  ] = await Promise.all([
    // GMV — total amount paid by customers on completed orders
    prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.completed },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Platform income — sum of commission amounts on completed orders
    prisma.vendorCommission.aggregate({
      where: { order: { paymentStatus: PaymentStatus.completed } },
      _sum: { commissionAmount: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.completed } }),
    prisma.order.count({ where: { status: OrderStatus.pending } }),
    prisma.user.count(),
    prisma.vendorProfile.count({ where: { status: VendorStatus.approved } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, status: ProductStatus.pending_approval } }),
    prisma.review.count({ where: { deletedAt: null } }),
    prisma.review.count({ where: { deletedAt: null, status: ReviewStatus.pending } }),
    prisma.refund.count(),
    prisma.refund.count({ where: { status: 'pending' } }),
    prisma.cart.count({ where: { items: { some: {} } } }),
  ]);

  const gmv = Number(revenueAgg._sum.total ?? 0);
  const completedCount = revenueAgg._count.id;

  return {
    totalRevenue:        gmv,
    totalPlatformIncome: Number(totalPlatformIncome._sum.commissionAmount ?? 0),
    totalOrders,
    completedOrders,
    pendingOrders,
    averageOrderValue:   completedCount > 0 ? Number((gmv / completedCount).toFixed(2)) : 0,
    refundRate:          totalOrders > 0 ? Number(((totalReturns / totalOrders) * 100).toFixed(2)) : 0,
    conversionRate:      (completedOrders + activeCarts) > 0
                          ? Number(((completedOrders / (completedOrders + activeCarts)) * 100).toFixed(2))
                          : 0,
    totalUsers,
    totalVendors,
    totalProducts,
    pendingProducts,
    totalReviews,
    pendingReviews,
    totalReturns,
    pendingReturns,
    activeCarts,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// revenue  —  revenue grouped by day in a date range
// ─────────────────────────────────────────────────────────────────────────────
export const getRevenue = async (from?: string, to?: string) => {
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  // Use raw query for date_trunc grouping (Prisma doesn't natively support it)
  const rows = await prisma.$queryRaw<
    { date: Date; revenue: number; orders: bigint }[]
  >`
    SELECT
      DATE_TRUNC('day', "createdAt") AS date,
      SUM(total)::float              AS revenue,
      COUNT(*)                       AS orders
    FROM orders
    WHERE "paymentStatus" = 'completed'
      AND "createdAt" >= ${fromDate}
      AND "createdAt" <= ${toDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date: r.date,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// topProducts  —  top 10 products by number of orders
// ─────────────────────────────────────────────────────────────────────────────
export const getTopProducts = async (limit = 10) => {
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    _count: { id: true },
    _sum: { subtotal: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  if (rows.length === 0) return [];

  const productIds = rows.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: {
      id: true, name: true, slug: true,
      images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
      vendor: { select: { id: true, storeName: true } },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  return rows.map((r) => ({
    product: productMap.get(r.productId) ?? null,
    totalOrders: r._count.id,
    totalRevenue: Number(r._sum.subtotal ?? 0),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// topVendors  —  top 10 vendors by revenue
// ─────────────────────────────────────────────────────────────────────────────
export const getTopVendors = async (limit = 10) => {
  const rows = await prisma.orderItem.groupBy({
    by: ['vendorId'],
    _count: { id: true },
    _sum: { subtotal: true },
    orderBy: { _sum: { subtotal: 'desc' } },
    take: limit,
  });

  if (rows.length === 0) return [];

  const vendorIds = rows.map((r) => r.vendorId);
  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, storeName: true, storeSlug: true, mediaAssets: { where: { folder: 'vendors/logos' }, select: { url: true, id: true }, take: 1 } },
  });

  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  return rows.map((r) => ({
    vendor: vendorMap.get(r.vendorId) ?? null,
    totalOrders: r._count.id,
    totalRevenue: Number(r._sum.subtotal ?? 0),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// usersGrowth  —  new user registrations grouped by day
// ─────────────────────────────────────────────────────────────────────────────
export const getUsersGrowth = async (from?: string, to?: string) => {
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const rows = await prisma.$queryRaw<{ date: Date; newUsers: bigint }[]>`
    SELECT
      DATE_TRUNC('day', "createdAt") AS date,
      COUNT(*)                       AS "newUsers"
    FROM users
    WHERE "createdAt" >= ${fromDate}
      AND "createdAt" <= ${toDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date: r.date,
    newUsers: Number(r.newUsers),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// getUsersWithActiveCarts  —  users who have at least one item in their cart
// ─────────────────────────────────────────────────────────────────────────────
export const getUsersWithActiveCarts = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const where = { items: { some: {} } };

  const [carts, total] = await Promise.all([
    prisma.cart.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        updatedAt: true,
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        },
        _count: { select: { items: true } },
        items: {
          select: {
            quantity: true,
            product: { select: { price: true } },
          },
        },
      },
    }),
    prisma.cart.count({ where }),
  ]);

  return {
    users: carts.map((c) => ({
      user: c.user,
      cartId: c.id,
      itemCount: c._count.items,
      estimatedTotal: Number(
        c.items
          .reduce((sum, i) => sum + i.quantity * Number(i.product?.price ?? 0), 0)
          .toFixed(2)
      ),
      lastActivity: c.updatedAt,
    })),
    meta: buildPaginationMeta(total, page, limit),
  };
};
