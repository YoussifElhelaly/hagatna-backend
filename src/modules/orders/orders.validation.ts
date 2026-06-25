import { z } from 'zod';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

// ─── Inline shipping address ──────────────────────────────────────────────────
const InlineShippingAddressSchema = z.object({
  recipientName: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  street: z.string().min(5),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  zipCode: z.string().max(20).optional(),
});

// ─── Place Order ──────────────────────────────────────────────────────────────
export const PlaceOrderSchema = z
  .object({
    addressId: z.string().uuid('Invalid address ID').optional(),
    shippingAddress: InlineShippingAddressSchema.optional(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    couponCode: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
    pointsToRedeem: z.number().int().positive().optional(),
    shippingMethodId: z.string().uuid('Invalid shipping method ID').optional(),
  })
  .refine(
    (data) => data.addressId || data.shippingAddress,
    { message: 'Either addressId or shippingAddress must be provided' }
  );

// ─── Admin — update order status ──────────────────────────────────────────────
export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().max(500).optional(),
});

// ─── Vendor — update item status ──────────────────────────────────────────────
export const UpdateItemStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

// ─── Params ───────────────────────────────────────────────────────────────────
export const OrderNumberParamSchema = z.object({
  orderNumber: z.string().min(1),
});

export const OrderItemIdParamSchema = z.object({
  itemId: z.string().uuid('Invalid order item ID'),
});

// ─── List queries ─────────────────────────────────────────────────────────────
export const CustomerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.nativeEnum(OrderStatus).optional(),
});

export const VendorItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  status: z.nativeEnum(OrderStatus).optional(),
});

export const AdminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  search: z.string().max(100).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

// ─── Returns / Refunds ────────────────────────────────────────────────────────
export const ReturnRequestSchema = z.object({
  orderItemId: z.string().uuid('Invalid order item ID').optional(),
  reason: z.string().min(10, 'Please provide a reason').max(500),
  amount: z.number().positive().optional(), // if omitted, full order amount is refunded
});

export const ReturnIdParamSchema = z.object({
  returnId: z.string().uuid('Invalid return ID'),
});

export const AdminReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(PaymentStatus).optional(),
  orderId: z.string().uuid().optional(),
});
