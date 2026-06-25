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

  const [totalEarned, totalPaid, totalPending] = await Promise.all([
    prisma.vendorCommission.aggregate({
      where,
      _sum: { commissionAmount: true },
    }),
    prisma.vendorCommission.aggregate({
      where: { ...where, status: PaymentStatus.completed },
      _sum: { commissionAmount: true },
    }),
    prisma.vendorCommission.aggregate({
      where: { ...where, status: PaymentStatus.pending },
      _sum: { commissionAmount: true },
    }),
  ]);

  // Per-vendor breakdown (top 20)
  const byVendor = await prisma.vendorCommission.groupBy({
    by: ['vendorId'],
    where,
    _sum: { commissionAmount: true, netAmount: true, grossAmount: true },
    _count: { id: true },
    orderBy: { _sum: { commissionAmount: 'desc' } },
    take: 20,
  });

  const vendorIds = byVendor.map((r) => r.vendorId);
  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, storeName: true, storeSlug: true },
  });
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

  return {
    summary: {
      totalEarned: Number(totalEarned._sum.commissionAmount ?? 0),
      totalPaid: Number(totalPaid._sum.commissionAmount ?? 0),
      totalPending: Number(totalPending._sum.commissionAmount ?? 0),
    },
    byVendor: byVendor.map((r) => ({
      vendor: vendorMap.get(r.vendorId) ?? null,
      totalOrders: r._count.id,
      grossAmount: Number(r._sum.grossAmount ?? 0),
      commissionEarned: Number(r._sum.commissionAmount ?? 0),
      netToVendor: Number(r._sum.netAmount ?? 0),
    })),
  };
};
