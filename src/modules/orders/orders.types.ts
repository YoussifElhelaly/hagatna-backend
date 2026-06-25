import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

// ─── Shipping address supplied inline at checkout ─────────────────────────────
export interface InlineShippingAddress {
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  zipCode?: string;
}

// ─── Place Order ──────────────────────────────────────────────────────────────
export interface PlaceOrderInput {
  /** Use a saved address by ID */
  addressId?: string;
  /** Or supply a one-off address inline */
  shippingAddress?: InlineShippingAddress;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  /** Number of loyalty points to redeem on this order */
  pointsToRedeem?: number;
  /** Shipping method chosen by customer at checkout */
  shippingMethodId?: string;
}

// ─── Admin — update overall order status ─────────────────────────────────────
export interface UpdateOrderStatusInput {
  status: OrderStatus;
  note?: string;
}

// ─── Vendor — update a single order item status ──────────────────────────────
export interface UpdateItemStatusInput {
  status: OrderStatus;
}

// ─── List queries ─────────────────────────────────────────────────────────────
export interface CustomerOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface VendorItemsQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface AdminOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;   // order number or customer email
  from?: string;     // ISO date string
  to?: string;       // ISO date string
}
