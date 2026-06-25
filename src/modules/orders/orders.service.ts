import { OrderStatus, PaymentStatus, DiscountType, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import { isValidTransition } from '@shared/constants/orderStatus';
import { notify } from '@modules/notifications/notifications.service';
import { earnPoints, redeemPoints, getRedeemableCategoryIds } from '@modules/loyalty/loyalty.service';
import {
  sendCustomerOrderPlacedEmail,
  sendVendorNewOrderEmail,
  sendCustomerOrderStatusEmail,
  sendCustomerRefundEmail,
} from '@shared/utils/email';
import type {
  PlaceOrderInput,
  UpdateOrderStatusInput,
  UpdateItemStatusInput,
  CustomerOrdersQuery,
  VendorItemsQuery,
  AdminOrdersQuery,
} from './orders.types';

// ─── Shared selects ───────────────────────────────────────────────────────────
const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  subtotal: true,
  taxAmount: true,
  shippingFee: true,
  discountAmount:  true,
  pointsRedeemed:  true,
  pointsDiscount:  true,
  pointsEarned:    true,
  total:           true,
  paymentMethod:   true,
  paymentStatus: true,
  shippingAddress: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const orderItemSelect = {
  id: true,
  productId: true,
  variantId: true,
  vendorId: true,
  productSnapshot: true,
  quantity: true,
  unitPrice: true,
  subtotal: true,
  status: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a unique order number like HGT-20240101-A3K9F */
const generateOrderNumber = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = () =>
    Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  let orderNumber: string;
  let attempts = 0;
  do {
    orderNumber = `HGT-${datePart}-${rand()}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  return orderNumber!;
};

/** Validate a coupon code and return the discount amount */
const validateCoupon = async (
  code: string,
  userId: string,
  subtotal: number
): Promise<{ promotionId: string; discountAmount: number }> => {
  const promo = await prisma.promotion.findUnique({ where: { code } });

  if (!promo || !promo.isActive) throw ApiError.badRequest('Invalid or expired coupon code');

  const now = new Date();
  if (promo.startsAt > now) throw ApiError.badRequest('This coupon is not yet active');
  if (promo.endsAt && promo.endsAt < now) throw ApiError.badRequest('This coupon has expired');

  if (promo.usageLimitTotal && promo.usageCount >= promo.usageLimitTotal) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }

  if (Number(promo.minPurchaseAmount) > subtotal) {
    throw ApiError.badRequest(
      `Minimum purchase of ${promo.minPurchaseAmount} required for this coupon`
    );
  }

  // Per-user usage check
  const userUsageCount = await prisma.couponUsage.count({
    where: { promotionId: promo.id, userId },
  });
  if (userUsageCount >= promo.usageLimitPerUser) {
    throw ApiError.badRequest('You have already used this coupon');
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

  return { promotionId: promo.id, discountAmount: Number(discountAmount.toFixed(2)) };
};

// ─────────────────────────────────────────────────────────────────────────────
// placeOrder  —  creates one Order per vendor in a single transaction
// ─────────────────────────────────────────────────────────────────────────────
export const placeOrder = async (userId: string, input: PlaceOrderInput) => {
  const { addressId, shippingAddress: inlineAddress, paymentMethod, couponCode, notes, pointsToRedeem, shippingMethodId } = input;

  // ── 1. Resolve shipping address ───────────────────────────────────────────
  let shippingAddressSnapshot: object;
  if (addressId) {
    const saved = await prisma.address.findUnique({ where: { id: addressId } });
    if (!saved || saved.userId !== userId) throw ApiError.notFound('Address not found');
    shippingAddressSnapshot = {
      recipientName: saved.recipientName,
      phone: saved.phone,
      street: saved.street,
      city: saved.city,
      country: saved.country,
      zipCode: saved.zipCode,
    };
  } else {
    shippingAddressSnapshot = inlineAddress!;
  }

  // ── 2. Fetch & validate cart ──────────────────────────────────────────────
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              vendor: { select: { id: true, commissionRate: true, status: true, storeName: true } },
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Your cart is empty');
  }

  // Validate every item is still purchasable
  for (const item of cart.items) {
    if (item.product.status !== 'active') {
      throw ApiError.badRequest(
        `Product "${(item.product.name as { en: string }).en}" is no longer available`
      );
    }
    if (item.product.vendor.status !== 'approved') {
      throw ApiError.badRequest(`A vendor for one of your items is no longer active`);
    }
    const availableStock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
    if (item.quantity > availableStock) {
      throw ApiError.badRequest(
        `Insufficient stock for "${(item.product.name as { en: string }).en}". Available: ${availableStock}`
      );
    }
  }

  // ── 3. Group items by vendor ──────────────────────────────────────────────
  type CartItem = (typeof cart.items)[number];
  const vendorGroups = new Map<string, CartItem[]>();
  for (const item of cart.items) {
    const vid = item.product.vendor.id;
    if (!vendorGroups.has(vid)) vendorGroups.set(vid, []);
    vendorGroups.get(vid)!.push(item);
  }

  // ── 4. Compute overall subtotal ───────────────────────────────────────────
  const totalSubtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
    0
  );

  // ── 5. Validate coupon (once, against overall subtotal) ───────────────────
  let totalDiscountAmount = 0;
  let promotionId: string | undefined;
  if (couponCode) {
    const coupon = await validateCoupon(couponCode, userId, totalSubtotal);
    totalDiscountAmount = coupon.discountAmount;
    promotionId = coupon.promotionId;
  }

  // ── 6. Pre-validate loyalty points redemption ─────────────────────────────
  let totalPointsDiscount = 0;
  let totalRedeemedPoints = 0;
  // eligibleSubtotal = subtotal of items in redeemable categories (all if list is empty)
  let totalEligibleSubtotal = totalSubtotal;
  // hoisted so step 7 can use it for per-vendor eligible ratio
  let redeemableCategoryIds: string[] = [];

  if (pointsToRedeem && pointsToRedeem > 0) {
    const settings = await prisma.loyaltySettings.findUnique({ where: { id: 'singleton' } });
    if (settings?.isEnabled) {
      // Determine which categories allow points redemption
      redeemableCategoryIds = await getRedeemableCategoryIds();
      if (redeemableCategoryIds.length > 0) {
        totalEligibleSubtotal = cart.items.reduce((sum, item) => {
          if (redeemableCategoryIds.includes(item.product.categoryId)) {
            return sum + Number(item.priceSnapshot) * item.quantity;
          }
          return sum;
        }, 0);
      }

      if (totalEligibleSubtotal === 0) {
        throw ApiError.badRequest('None of your cart items are eligible for points redemption');
      }

      const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
      if (!account || account.balance < pointsToRedeem) {
        throw ApiError.badRequest('Insufficient loyalty points');
      }
      if (account.balance < settings.minRedemptionPoints) {
        throw ApiError.badRequest(`You need at least ${settings.minRedemptionPoints} points to redeem`);
      }
      totalPointsDiscount = Number((pointsToRedeem * Number(settings.pointValue)).toFixed(2));
      const maxAllowed = Number(
        ((Number(settings.maxRedemptionPercent) / 100) * totalEligibleSubtotal).toFixed(2)
      );
      if (totalPointsDiscount > maxAllowed) {
        throw ApiError.badRequest(
          `Points discount cannot exceed ${settings.maxRedemptionPercent}% of eligible items total`
        );
      }
      totalRedeemedPoints = pointsToRedeem;
    }
  }

  // ── 6.5. Resolve shipping method & fee ────────────────────────────────────
  let totalShippingFee = 0;
  if (shippingMethodId) {
    const method = await prisma.shippingMethod.findFirst({
      where: { id: shippingMethodId, isActive: true, deletedAt: null },
    });
    if (!method) throw ApiError.notFound('Shipping method not found or inactive');
    if (method.isFree) {
      totalShippingFee = 0;
    } else if (method.minOrderForFree && totalSubtotal >= Number(method.minOrderForFree)) {
      totalShippingFee = 0;
    } else {
      totalShippingFee = Number(method.price);
    }
  }

  // ── 7. Transaction — one order per vendor ─────────────────────────────────
  const createdOrders = await prisma.$transaction(async (tx) => {
    const orders: { id: string; orderNumber: string }[] = [];
    let isFirstVendor = true;

    for (const [, items] of vendorGroups) {
      // Per-vendor proportional financials
      const vendorSubtotal = items.reduce(
        (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
        0
      );
      const vendorRatio = vendorSubtotal / totalSubtotal;
      const vendorDiscountAmount = Number((totalDiscountAmount * vendorRatio).toFixed(2));

      // Points discount distributed by each vendor's share of ELIGIBLE subtotal
      const vendorEligibleSubtotal = redeemableCategoryIds.length === 0
        ? vendorSubtotal  // empty list = all categories eligible
        : items.reduce((sum, item) => {
            if (redeemableCategoryIds.includes((item.product as any).categoryId)) {
              return sum + Number(item.priceSnapshot) * item.quantity;
            }
            return sum;
          }, 0);
      const pointsRatio = totalEligibleSubtotal > 0 ? vendorEligibleSubtotal / totalEligibleSubtotal : 0;
      const vendorPointsDiscount = Number((totalPointsDiscount * pointsRatio).toFixed(2));
      const vendorRedeemedPoints = Math.round(totalRedeemedPoints * pointsRatio);
      const vendorShippingFee = Number((totalShippingFee * vendorRatio).toFixed(2));
      const vendorFinalTotal = Number(
        Math.max(0, vendorSubtotal - vendorDiscountAmount - vendorPointsDiscount + vendorShippingFee).toFixed(2)
      );

      const orderNumber = await generateOrderNumber();

      // a. Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          subtotal:       vendorSubtotal,
          taxAmount:      0,
          shippingFee:    vendorShippingFee,
          discountAmount: vendorDiscountAmount,
          total:          vendorFinalTotal,
          pointsRedeemed: vendorRedeemedPoints,
          pointsDiscount: vendorPointsDiscount,
          paymentMethod,
          shippingAddress: shippingAddressSnapshot,
          notes,
        },
      });

      // b. Order items + commissions + stock decrement
      for (const item of items) {
        const unitPrice = Number(item.priceSnapshot);
        const itemSubtotal = Number((unitPrice * item.quantity).toFixed(2));
        const vendor = item.product.vendor;

        const productSnapshot = {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          image: item.product.images[0]?.url ?? null,
          vendorId: vendor.id,
          vendorStoreName: vendor.storeName,
          variantName: item.variant?.name ?? null,
          variantOptions: item.variant?.options ?? null,
        };

        const orderItem = await tx.orderItem.create({
          data: {
            orderId:  newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            vendorId:  vendor.id,
            productSnapshot,
            quantity:  item.quantity,
            unitPrice,
            subtotal:  itemSubtotal,
          },
        });

        const commissionRate   = Number(vendor.commissionRate);
        const commissionAmount = Number(((commissionRate / 100) * itemSubtotal).toFixed(2));
        const netAmount        = Number((itemSubtotal - commissionAmount).toFixed(2));

        await tx.vendorCommission.create({
          data: {
            vendorId: vendor.id,
            orderId:  newOrder.id,
            orderItemId: orderItem.id,
            grossAmount: itemSubtotal,
            commissionRate,
            commissionAmount,
            netAmount,
          },
        });

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data:  { stockQuantity: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stockQuantity: { decrement: item.quantity } },
          });
        }
      }

      // c. Initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId:        newOrder.id,
          previousStatus: OrderStatus.pending,
          newStatus:      OrderStatus.pending,
          note:           'Order placed',
          changedById:    userId,
        },
      });

      // d. Coupon usage — recorded once (against the first vendor order)
      if (promotionId && isFirstVendor) {
        await tx.couponUsage.create({
          data: {
            promotionId,
            userId,
            orderId:         newOrder.id,
            discountApplied: totalDiscountAmount,
          },
        });
        await tx.promotion.update({
          where: { id: promotionId },
          data:  { usageCount: { increment: 1 } },
        });
      }

      // e. Loyalty — redeem points once (against first vendor order)
      if (totalRedeemedPoints > 0 && isFirstVendor) {
        await redeemPoints(
          { userId, orderId: newOrder.id, pointsToRedeem: totalRedeemedPoints },
          totalSubtotal,
          tx
        );
      }

      // f. Earn points for this vendor's order amount
      const earnedPoints = await earnPoints(
        { userId, orderId: newOrder.id, orderTotal: vendorFinalTotal },
        tx
      );
      if (earnedPoints > 0) {
        await tx.order.update({
          where: { id: newOrder.id },
          data:  { pointsEarned: earnedPoints },
        });
      }

      orders.push({ id: newOrder.id, orderNumber: newOrder.orderNumber });
      isFirstVendor = false;
    }

    // g. Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return orders;
  });

  // Fire-and-forget notifications
  for (const { id, orderNumber } of createdOrders) {
    notify.orderPlaced(userId, orderNumber, id);
  }

  // Return full details for every created order
  const fullOrders = await Promise.all(
    createdOrders.map(({ orderNumber }) => getOrderByNumber(userId, orderNumber, false))
  );

  // Fire-and-forget emails
  const customer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (customer) {
    for (const order of fullOrders) {
      const items = (order.items as any[]).map((item: any) => ({
        name: (item.productSnapshot as any).name?.en ?? 'Product',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        imageUrl: (item.productSnapshot as any).image ?? undefined,
      }));

      sendCustomerOrderPlacedEmail(
        customer.email,
        customer.name,
        order.orderNumber,
        order.id,
        items,
        Number(order.subtotal),
        Number(order.shippingFee),
        Number(order.total),
        '3-5 business days',
      );

      // Notify each vendor
      const vendorIds = [...new Set(items.map((_: any, i: number) => (order.items[i] as any).vendorId))];
      for (const vendorId of vendorIds) {
        const vendor = await prisma.vendorProfile.findUnique({
          where: { id: vendorId },
          select: { id: true, storeName: true, user: { select: { name: true, email: true } } },
        });
        if (vendor?.user) {
          const vendorItems = items.filter((_: any, i: number) => (order.items[i] as any).vendorId === vendorId);
          const vendorTotal = vendorItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);
          sendVendorNewOrderEmail(
            vendor.user.email,
            (vendor.storeName as any)?.en ?? 'Vendor',
            order.orderNumber,
            order.id,
            vendorItems,
            vendorTotal,
            customer.name,
            JSON.stringify(order.shippingAddress),
            order.createdAt.toISOString(),
          );
        }
      }
    }
  }

  return fullOrders;
};

// ─────────────────────────────────────────────────────────────────────────────
// getMyOrders  —  customer list
// ─────────────────────────────────────────────────────────────────────────────
export const getMyOrders = async (userId: string, query: CustomerOrdersQuery) => {
  const { page = 1, limit = 10, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    userId,
    ...(status && { status }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...orderSummarySelect,
        items: {
          select: {
            ...orderItemSelect,
          },
          take: 3, // preview
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByNumber  —  full detail (customer or admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderByNumber = async (
  userId: string,
  orderNumber: string,
  isAdmin: boolean
) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      ...orderSummarySelect,
      user: { select: { id: true, name: true, email: true } },
      items: { select: orderItemSelect },
      statusHistory: {
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          note: true,
          createdAt: true,
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (!isAdmin && order.user.id !== userId) throw ApiError.forbidden('Access denied');

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
// cancelOrder  —  customer cancels their own pending/confirmed order
// ─────────────────────────────────────────────────────────────────────────────
export const cancelOrder = async (userId: string, orderNumber: string) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { variant: true } },
    },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== userId) throw ApiError.forbidden('Access denied');

  if (!isValidTransition(order.status, OrderStatus.cancelled)) {
    throw ApiError.conflict(
      `Cannot cancel an order with status "${order.status}"`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Update order status
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.cancelled },
    });

    // Restore stock
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    // Record history
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: OrderStatus.cancelled,
        note: 'Cancelled by customer',
        changedById: userId,
      },
    });
  });

  const fullOrder = await getOrderByNumber(userId, orderNumber, false);

  // Fire-and-forget email
  sendCustomerOrderStatusEmail(
    fullOrder.user.email,
    fullOrder.user.name,
    fullOrder.orderNumber,
    fullOrder.id,
    'cancelled',
  );

  return fullOrder;
};

// ─────────────────────────────────────────────────────────────────────────────
// getVendorItems  —  all order items belonging to this vendor
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorItems = async (userId: string, query: VendorItemsQuery) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');

  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderItemWhereInput = {
    vendorId: vendor.id,
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.orderItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { order: { createdAt: 'desc' } },
      select: {
        ...orderItemSelect,
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
            paymentStatus: true,
            shippingAddress: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.orderItem.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getVendorOrderDetail  —  vendor views full details of one order (their items only)
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorOrderDetail = async (userId: string, orderNumber: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      ...orderSummarySelect,
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        where: { vendorId: vendor.id },
        select: { ...orderItemSelect },
      },
      shipments: {
        where: { vendorId: vendor.id },
        select: {
          id:             true,
          trackingNumber: true,
          carrier:        true,
          status:         true,
          shippedAt:      true,
          deliveredAt:    true,
        },
      },
      statusHistory: {
        select: {
          id:             true,
          previousStatus: true,
          newStatus:      true,
          note:           true,
          createdAt:      true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) throw ApiError.notFound('Order not found');

  // Ensure the vendor actually has items in this order
  if (!order.items.length) throw ApiError.forbidden('You have no items in this order');

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateItemStatus  —  vendor updates their own item's fulfillment status
// ─────────────────────────────────────────────────────────────────────────────
export const updateItemStatus = async (
  userId: string,
  itemId: string,
  input: UpdateItemStatusInput
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item) throw ApiError.notFound('Order item not found');
  if (item.vendorId !== vendor.id) throw ApiError.forbidden('Access denied');

  // Vendor-allowed transitions: pending → confirmed → processing → shipped
  const vendorAllowed: OrderStatus[] = [
    OrderStatus.confirmed,
    OrderStatus.processing,
    OrderStatus.shipped,
  ];
  if (!vendorAllowed.includes(input.status)) {
    throw ApiError.badRequest(
      `Vendors can only set status to: confirmed, processing, or shipped`
    );
  }
  if (!isValidTransition(item.status, input.status)) {
    throw ApiError.conflict(
      `Cannot transition item from "${item.status}" to "${input.status}"`
    );
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status: input.status },
    select: orderItemSelect,
  });

  // Fire-and-forget email to customer
  const order = await prisma.order.findUnique({ where: { id: item.orderId }, select: { id: true, orderNumber: true, userId: true } });
  if (order) {
    const customer = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
    if (customer) {
      sendCustomerOrderStatusEmail(customer.email, customer.name, order.orderNumber, order.id, input.status);
    }
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — listAllOrders
// ─────────────────────────────────────────────────────────────────────────────
export const listAllOrders = async (query: AdminOrdersQuery) => {
  const { page = 1, limit = 20, status, paymentStatus, search, from, to } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(paymentStatus && { paymentStatus }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...orderSummarySelect,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — updateOrderStatus
// ─────────────────────────────────────────────────────────────────────────────
export const updateOrderStatus = async (
  adminId: string,
  orderNumber: string,
  input: UpdateOrderStatusInput
) => {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw ApiError.notFound('Order not found');

  if (!isValidTransition(order.status, input.status)) {
    throw ApiError.conflict(
      `Cannot transition order from "${order.status}" to "${input.status}"`
    );
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { orderNumber },
      data: { status: input.status },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: input.status,
        note: input.note,
        changedById: adminId,
      },
    }),
  ]);

  // Notify the customer of the status change
  notify.orderStatusChanged(order.userId, orderNumber, order.id, input.status);

  // Fire-and-forget email
  const customer = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
  if (customer) {
    sendCustomerOrderStatusEmail(customer.email, customer.name, orderNumber, order.id, input.status);
  }

  return getOrderByNumber(adminId, orderNumber, true);
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — getAdminOrderDetail  (full order with all relations)
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminOrderDetail = async (orderNumber: string) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      ...orderSummarySelect,
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        select: {
          ...orderItemSelect,
          product: { select: { id: true, name: true, slug: true } },
        },
      },
      statusHistory: {
        select: {
          id: true, previousStatus: true, newStatus: true,
          note: true, createdAt: true,
          changedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      shipments: {
        include: {
          vendor: { select: { id: true, storeName: true } },
          shippingMethod: { select: { id: true, name: true } },
        },
      },
      payment: true,
      refunds: {
        select: {
          id: true, amount: true, reason: true, status: true,
          processedAt: true, createdAt: true,
          orderItem: { select: { id: true, productSnapshot: true } },
        },
      },
      couponUsages: {
        select: {
          id: true, discountApplied: true,
          promotion: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });

  if (!order) throw ApiError.notFound('Order not found');
  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
// requestReturn  —  customer requests a return/refund on a delivered order
// ─────────────────────────────────────────────────────────────────────────────
export const requestReturn = async (
  userId: string,
  orderNumber: string,
  input: { orderItemId?: string; reason: string; amount?: number }
) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payment: true },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== userId) throw ApiError.forbidden('Access denied');
  if (order.status !== OrderStatus.delivered) {
    throw ApiError.conflict('Returns are only allowed for delivered orders');
  }
  if (!order.payment || order.paymentStatus !== PaymentStatus.completed) {
    throw ApiError.conflict('Cannot request a return for an unpaid order');
  }

  // If a specific item is targeted, validate it belongs to this order
  if (input.orderItemId) {
    const item = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId, orderId: order.id },
    });
    if (!item) throw ApiError.notFound('Order item not found in this order');
  }

  // Refund amount defaults to the full order total
  const refundAmount = input.amount
    ? Math.min(input.amount, Number(order.total))
    : Number(order.total);

  const refund = await prisma.refund.create({
    data: {
      paymentId: order.payment.id,
      orderId: order.id,
      orderItemId: input.orderItemId ?? null,
      amount: refundAmount,
      reason: input.reason,
      status: PaymentStatus.pending,
    },
    select: {
      id: true, amount: true, reason: true, status: true, createdAt: true,
      order: { select: { orderNumber: true } },
      orderItem: { select: { id: true, productSnapshot: true } },
    },
  });

  return refund;
};

// ─────────────────────────────────────────────────────────────────────────────
// listReturns  —  admin lists all return requests
// ─────────────────────────────────────────────────────────────────────────────
export const listReturns = async (query: {
  page?: number; limit?: number; status?: PaymentStatus; orderId?: string;
}) => {
  const { page = 1, limit = 20, status, orderId } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(orderId && { orderId }),
  };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, reason: true, status: true,
        processedAt: true, createdAt: true,
        order: {
          select: {
            id: true, orderNumber: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        orderItem: { select: { id: true, productSnapshot: true } },
        payment: { select: { id: true, method: true } },
      },
    }),
    prisma.refund.count({ where }),
  ]);

  return { refunds, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// approveReturn  —  admin approves the return, sets order status to refunded
// ─────────────────────────────────────────────────────────────────────────────
export const approveReturn = async (returnId: string, adminId: string) => {
  const refund = await prisma.refund.findUnique({
    where: { id: returnId },
    include: { order: true },
  });

  if (!refund) throw ApiError.notFound('Return request not found');
  if (refund.status !== PaymentStatus.pending) {
    throw ApiError.conflict('This return has already been processed');
  }

  await prisma.$transaction(async (tx) => {
    // Mark order as refunded
    await tx.order.update({
      where: { id: refund.orderId },
      data: { status: OrderStatus.refunded },
    });
    // Log status history
    await tx.orderStatusHistory.create({
      data: {
        orderId: refund.orderId,
        previousStatus: refund.order.status,
        newStatus: OrderStatus.refunded,
        note: `Return approved for refund #${returnId}`,
        changedById: adminId,
      },
    });
  });

  const updatedRefund = await prisma.refund.findUnique({
    where: { id: returnId },
    select: {
      id: true, amount: true, reason: true, status: true,
      order: { select: { id: true, orderNumber: true, userId: true, status: true } },
    },
  });

  // Fire-and-forget email
  if (updatedRefund) {
    const customer = await prisma.user.findUnique({ where: { id: updatedRefund.order.userId }, select: { name: true, email: true } });
    if (customer) {
      sendCustomerRefundEmail(customer.email, customer.name, updatedRefund.order.orderNumber, Number(updatedRefund.amount), 'approved', updatedRefund.order.id);
    }
  }

  return updatedRefund;
};

// ─────────────────────────────────────────────────────────────────────────────
// processRefund  —  admin marks refund as completed (money sent back)
// ─────────────────────────────────────────────────────────────────────────────
export const processRefund = async (returnId: string) => {
  const refund = await prisma.refund.findUnique({ where: { id: returnId } });
  if (!refund) throw ApiError.notFound('Return request not found');
  if (refund.status === PaymentStatus.completed) {
    throw ApiError.conflict('This refund has already been processed');
  }

  const updated = await prisma.refund.update({
    where: { id: returnId },
    data: { status: PaymentStatus.completed, processedAt: new Date() },
    select: {
      id: true, amount: true, reason: true, status: true, processedAt: true,
      order: { select: { id: true, orderNumber: true, userId: true } },
    },
  });

  // Fire-and-forget email
  const customer = await prisma.user.findUnique({ where: { id: updated.order.userId }, select: { name: true, email: true } });
  if (customer) {
    sendCustomerRefundEmail(customer.email, customer.name, updated.order.orderNumber, Number(updated.amount), 'completed', updated.order.id);
  }

  return updated;
};
