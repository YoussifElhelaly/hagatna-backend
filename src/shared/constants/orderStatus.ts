import { OrderStatus, PaymentStatus, ShipmentStatus, VendorStatus, ProductStatus } from '@prisma/client';

export { OrderStatus, PaymentStatus, ShipmentStatus, VendorStatus, ProductStatus };

export const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.pending]:    [OrderStatus.confirmed, OrderStatus.cancelled],
  [OrderStatus.confirmed]:  [OrderStatus.processing, OrderStatus.cancelled],
  [OrderStatus.processing]: [OrderStatus.shipped, OrderStatus.cancelled],
  [OrderStatus.shipped]:    [OrderStatus.delivered],
  [OrderStatus.delivered]:  [OrderStatus.refunded],
  [OrderStatus.cancelled]:  [],
  [OrderStatus.refunded]:   [],
};

export const isValidTransition = (from: OrderStatus, to: OrderStatus): boolean => {
  return ORDER_FLOW[from]?.includes(to) ?? false;
};
