import { describe, it, expect, vi, beforeEach } from 'vitest';

const txMock = {
  orderItem: { update: vi.fn() },
  product: { update: vi.fn() },
  productVariant: { update: vi.fn() },
  vendorCommission: { updateMany: vi.fn() },
};

vi.mock('@database/prisma/client', () => ({
  prisma: {
    vendorProfile: { findUnique: vi.fn() },
    orderItem: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
  },
}));

vi.mock('@shared/utils/email', () => ({
  sendCustomerOrderStatusEmail: vi.fn(),
}));

import * as OrdersService from '@modules/orders/orders.service';
import { prisma } from '@database/prisma/client';

const mockVendorProfile = vi.mocked(prisma.vendorProfile);
const mockOrderItem = vi.mocked(prisma.orderItem);
const mockOrder = vi.mocked(prisma.order);
const mockUser = vi.mocked(prisma.user);

describe('OrdersService.updateItemStatus — vendor decline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lets a vendor decline a pending item: sets it cancelled, restores stock, voids the commission', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockOrderItem.findUnique.mockResolvedValueOnce({
      id: 'item-1', vendorId: 'vendor-1', status: 'pending',
      productId: 'prod-1', variantId: null, quantity: 3, orderId: 'order-1',
    } as never);
    txMock.orderItem.update.mockResolvedValueOnce({ id: 'item-1', status: 'cancelled' } as never);
    mockOrder.findUnique.mockResolvedValueOnce({ id: 'order-1', orderNumber: 'ORD-1', userId: 'user-1' } as never);
    mockUser.findUnique.mockResolvedValueOnce({ name: 'Sara', email: 's@x.com' } as never);

    const result = await OrdersService.updateItemStatus('vendor-user-1', 'item-1', { status: 'cancelled' } as never);

    expect(result).toEqual({ id: 'item-1', status: 'cancelled' });
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stockQuantity: { increment: 3 } },
    });
    expect(txMock.productVariant.update).not.toHaveBeenCalled();
    expect(txMock.vendorCommission.updateMany).toHaveBeenCalledWith({
      where: { orderItemId: 'item-1', status: 'pending' },
      data: { status: 'failed' },
    });
  });

  it('restores variant stock when the item has a variant', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockOrderItem.findUnique.mockResolvedValueOnce({
      id: 'item-1', vendorId: 'vendor-1', status: 'pending',
      productId: 'prod-1', variantId: 'var-1', quantity: 2, orderId: 'order-1',
    } as never);
    txMock.orderItem.update.mockResolvedValueOnce({ id: 'item-1', status: 'cancelled' } as never);
    mockOrder.findUnique.mockResolvedValueOnce(null as never);

    await OrdersService.updateItemStatus('vendor-user-1', 'item-1', { status: 'cancelled' } as never);

    expect(txMock.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'var-1' },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(txMock.product.update).not.toHaveBeenCalled();
  });

  it('rejects declining an item that already shipped', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockOrderItem.findUnique.mockResolvedValueOnce({
      id: 'item-1', vendorId: 'vendor-1', status: 'shipped',
      productId: 'prod-1', variantId: null, quantity: 1, orderId: 'order-1',
    } as never);

    await expect(
      OrdersService.updateItemStatus('vendor-user-1', 'item-1', { status: 'cancelled' } as never)
    ).rejects.toThrow('Cannot transition item from "shipped" to "cancelled"');
    expect(txMock.orderItem.update).not.toHaveBeenCalled();
  });

  it('rejects updating an item owned by another vendor', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockOrderItem.findUnique.mockResolvedValueOnce({
      id: 'item-1', vendorId: 'vendor-2', status: 'pending',
    } as never);

    await expect(
      OrdersService.updateItemStatus('vendor-user-1', 'item-1', { status: 'cancelled' } as never)
    ).rejects.toThrow('Access denied');
  });
});
