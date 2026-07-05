import { PaymentStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';

// ─── Commission select ────────────────────────────────────────────────────────
const commissionSelect = {
  id: true,
  vendorId: true,
  orderId: true,
  orderItemId: true,
  grossAmount: true,
  commissionRate: true,
  commissionAmount: true,
  netAmount: true,
  status: true,
  paidAt: true,
  paymentProof: true,
  createdAt: true,
  vendor: { select: { id: true, storeName: true, storeSlug: true } },
  order: { select: { orderNumber: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// listPayouts  —  admin: list all commission records (vendor payouts)
// ─────────────────────────────────────────────────────────────────────────────
export const listPayouts = async (query: {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  vendorId?: string;
}) => {
  const { page = 1, limit = 20, status, vendorId } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(vendorId && { vendorId }),
  };

  const [payouts, total] = await Promise.all([
    prisma.vendorCommission.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: commissionSelect,
    }),
    prisma.vendorCommission.count({ where }),
  ]);

  return { payouts, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// approvePayout  —  admin marks a commission as paid out (status → completed)
// ─────────────────────────────────────────────────────────────────────────────
export const approvePayout = async (
  payoutId: string,
  proof?: { url: string; publicId: string }
) => {
  const commission = await prisma.vendorCommission.findUnique({ where: { id: payoutId } });
  if (!commission) throw ApiError.notFound('Payout record not found');
  if (commission.status === PaymentStatus.completed) {
    throw ApiError.conflict('This payout has already been approved');
  }

  return prisma.vendorCommission.update({
    where: { id: payoutId },
    data: {
      status:                PaymentStatus.completed,
      paidAt:                new Date(),
      ...(proof && {
        paymentProof:          proof.url,
        paymentProofPublicId:  proof.publicId,
      }),
    },
    select: commissionSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// getCommissionsSummary  —  admin: aggregate totals per vendor
// ─────────────────────────────────────────────────────────────────────────────
export const getCommissionsSummary = async (vendorId?: string) => {
  const where = vendorId ? { vendorId } : {};

  const [totals, paidNet, pendingNet] = await Promise.all([
    prisma.vendorCommission.aggregate({
      where,
      _sum: { commissionAmount: true, netAmount: true, grossAmount: true },
    }),
    prisma.vendorCommission.aggregate({
      where: { ...where, status: PaymentStatus.completed },
      _sum: { netAmount: true },
    }),
    prisma.vendorCommission.aggregate({
      where: { ...where, status: PaymentStatus.pending },
      _sum: { netAmount: true },
    }),
  ]);

  // Per-vendor breakdown (top 20) + pending/paid net split per vendor
  const [byVendor, byVendorStatus] = await Promise.all([
    prisma.vendorCommission.groupBy({
      by: ['vendorId'],
      where,
      _sum: { commissionAmount: true, netAmount: true, grossAmount: true },
      _count: { id: true },
      orderBy: { _sum: { commissionAmount: 'desc' } },
      take: 20,
    }),
    prisma.vendorCommission.groupBy({
      by: ['vendorId', 'status'],
      where,
      _sum: { netAmount: true },
    }),
  ]);

  const statusMap = new Map<string, { pending: number; paid: number }>();
  for (const r of byVendorStatus) {
    const entry = statusMap.get(r.vendorId) ?? { pending: 0, paid: 0 };
    if (r.status === PaymentStatus.pending)   entry.pending = Number(r._sum.netAmount ?? 0);
    if (r.status === PaymentStatus.completed) entry.paid    = Number(r._sum.netAmount ?? 0);
    statusMap.set(r.vendorId, entry);
  }

  const vendorIds = byVendor.map((r) => r.vendorId);
  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, storeName: true, storeSlug: true },
  });
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

  return {
    summary: {
      totalGross:   Number(totals._sum.grossAmount ?? 0),       // total sales volume
      totalEarned:  Number(totals._sum.commissionAmount ?? 0),  // platform commission
      totalNet:     Number(totals._sum.netAmount ?? 0),         // total owed to vendors
      totalPaid:    Number(paidNet._sum.netAmount ?? 0),        // net paid out to vendors
      totalPending: Number(pendingNet._sum.netAmount ?? 0),     // net still owed to vendors
    },
    byVendor: byVendor.map((r) => ({
      vendor: vendorMap.get(r.vendorId) ?? null,
      totalOrders: r._count.id,
      grossAmount: Number(r._sum.grossAmount ?? 0),
      commissionEarned: Number(r._sum.commissionAmount ?? 0),
      netToVendor: Number(r._sum.netAmount ?? 0),
      pendingAmount: statusMap.get(r.vendorId)?.pending ?? 0,
      paidAmount: statusMap.get(r.vendorId)?.paid ?? 0,
    })),
  };
};
