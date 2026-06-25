import { Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { createNotification } from '@modules/notifications/notifications.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestReturnInput {
  orderNumber: string;
  orderItemId?: string;
  reason: string;
}

export interface AdminListReturnsQuery {
  page: number;
  limit: number;
  status?: 'pending' | 'completed' | 'failed';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInclude() {
  return {
    order: { select: { orderNumber: true, userId: true } },
    payment: { select: { id: true, method: true, transactionId: true } },
    orderItem: {
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        product: { select: { id: true, name: true } },
      },
    },
  } as const;
}

// ─── 1. Customer: request a return ───────────────────────────────────────────
export const requestReturn = async (userId: string, input: RequestReturnInput) => {
  const { orderNumber, orderItemId, reason } = input;

  // Find the order and verify ownership
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      payment: true,
      items: orderItemId ? { where: { id: orderItemId } } : true,
    },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== userId) throw ApiError.forbidden('You do not own this order');

  // Order must be delivered to request a return
  if (order.status !== 'delivered') {
    throw ApiError.badRequest('Returns can only be requested for delivered orders');
  }

  // Must have a completed payment
  if (!order.payment || order.payment.status !== 'completed') {
    throw ApiError.badRequest('No completed payment found for this order');
  }

  // Validate the order item if provided
  if (orderItemId) {
    if (!order.items.length) {
      throw ApiError.notFound('Order item not found on this order');
    }
  }

  // Prevent duplicate pending return for the same order (or same item)
  const existing = await prisma.refund.findFirst({
    where: {
      orderId: order.id,
      ...(orderItemId ? { orderItemId } : {}),
      status: 'pending',
    },
  });
  if (existing) {
    throw ApiError.conflict('A return request is already pending for this order');
  }

  // Determine refund amount: item price × qty, or full order total
  let amount: Prisma.Decimal;
  if (orderItemId && order.items[0]) {
    const item = order.items[0];
    amount = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
  } else {
    amount = order.total;
  }

  const refund = await prisma.refund.create({
    data: {
      paymentId: order.payment.id,
      orderId: order.id,
      ...(orderItemId ? { orderItemId } : {}),
      amount,
      reason,
      status: 'pending',
    },
    include: buildInclude(),
  });

  return refund;
};

// ─── 2. Customer: list own returns ───────────────────────────────────────────
export const listMyReturns = async (
  userId: string,
  page: number,
  limit: number,
  status?: 'pending' | 'completed' | 'failed'
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.RefundWhereInput = {
    order: { userId },
    ...(status ? { status } : {}),
  };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: buildInclude(),
    }),
    prisma.refund.count({ where }),
  ]);

  return {
    refunds,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 3. Customer: view single return ─────────────────────────────────────────
export const getMyReturn = async (userId: string, returnId: string) => {
  const refund = await prisma.refund.findUnique({
    where: { id: returnId },
    include: buildInclude(),
  });

  if (!refund) throw ApiError.notFound('Return not found');
  if (refund.order.userId !== userId) throw ApiError.forbidden('Access denied');

  return refund;
};

// ─── 4. Vendor: list returns for vendor's orders ─────────────────────────────
export const vendorListReturns = async (
  userId: string,
  page: number,
  limit: number,
  status?: 'pending' | 'completed' | 'failed'
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.notFound('Vendor profile not found');

  const skip = (page - 1) * limit;

  const where: Prisma.RefundWhereInput = {
    order: {
      items: {
        some: {
          product: { vendorId: vendor.id },
        },
      },
    },
    ...(status ? { status } : {}),
  };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: buildInclude(),
    }),
    prisma.refund.count({ where }),
  ]);

  return {
    refunds,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 5. Admin: list all returns ───────────────────────────────────────────────
export const adminListReturns = async (query: AdminListReturnsQuery) => {
  const { page, limit, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.RefundWhereInput = status ? { status } : {};

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: buildInclude(),
    }),
    prisma.refund.count({ where }),
  ]);

  return {
    refunds,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 5. Admin: approve return ────────────────────────────────────────────────
export const approveReturn = async (returnId: string, refundAmountOverride?: number) => {
  const refund = await prisma.refund.findUnique({
    where: { id: returnId },
    include: { order: true, payment: true },
  });

  if (!refund) throw ApiError.notFound('Return not found');
  if (refund.status !== 'pending') {
    throw ApiError.badRequest(`Return is already ${refund.status}`);
  }

  const finalAmount = refundAmountOverride
    ? new Prisma.Decimal(refundAmountOverride)
    : refund.amount;

  // Update refund + order status in a transaction
  const [updatedRefund] = await prisma.$transaction([
    prisma.refund.update({
      where: { id: returnId },
      data: {
        status: 'completed',
        amount: finalAmount,
        processedAt: new Date(),
      },
      include: buildInclude(),
    }),
    prisma.order.update({
      where: { id: refund.orderId },
      data: { status: 'refunded', paymentStatus: 'refunded' },
    }),
  ]);

  // Notify the customer
  await createNotification({
    userId: refund.order.userId,
    type: 'order',
    title: { en: 'Return Approved', ar: 'تمت الموافقة على طلب الإرجاع' },
    body: {
      en: `Your return request has been approved. A refund of ${finalAmount} will be processed shortly.`,
      ar: `تمت الموافقة على طلب إرجاعك. سيتم معالجة استرداد بقيمة ${finalAmount} قريباً.`,
    },
    data: { orderId: refund.orderId, refundId: returnId },
  });

  return updatedRefund;
};

// ─── 6. Admin: reject return ─────────────────────────────────────────────────
export const rejectReturn = async (returnId: string, note?: string) => {
  const refund = await prisma.refund.findUnique({
    where: { id: returnId },
    include: { order: true },
  });

  if (!refund) throw ApiError.notFound('Return not found');
  if (refund.status !== 'pending') {
    throw ApiError.badRequest(`Return is already ${refund.status}`);
  }

  const updatedRefund = await prisma.refund.update({
    where: { id: returnId },
    data: {
      status: 'failed',
      processedAt: new Date(),
      ...(note ? { reason: `${refund.reason ?? ''}\n\n[Rejected]: ${note}`.trim() } : {}),
    },
    include: buildInclude(),
  });

  // Notify the customer
  await createNotification({
    userId: refund.order.userId,
    type: 'order',
    title: { en: 'Return Request Rejected', ar: 'تم رفض طلب الإرجاع' },
    body: {
      en: note ? `Your return request was rejected: ${note}` : 'Your return request has been rejected.',
      ar: note ? `تم رفض طلب الإرجاع الخاص بك: ${note}` : 'تم رفض طلب الإرجاع الخاص بك.',
    },
    data: { orderId: refund.orderId, refundId: returnId },
  });

  return updatedRefund;
};
