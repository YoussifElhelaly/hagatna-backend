import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    vendorProfile: { findUnique: vi.fn() },
    product: { findFirst: vi.fn() },
  },
}));

import * as ProductsService from '@modules/products/products.service';
import { prisma } from '@database/prisma/client';

const mockVendorProfile = vi.mocked(prisma.vendorProfile);
const mockProduct = vi.mocked(prisma.product);

describe('ProductsService.getVendorProductById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the product when the vendor owns it', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'approved' } as never);
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p1', vendorId: 'vendor-1' } as never);

    const result = await ProductsService.getVendorProductById('user-1', 'p1');

    expect(result).toEqual({ id: 'p1', vendorId: 'vendor-1' });
  });

  it('rejects when the product belongs to a different vendor', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'approved' } as never);
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p1', vendorId: 'vendor-2' } as never);

    await expect(
      ProductsService.getVendorProductById('user-1', 'p1')
    ).rejects.toThrow('You do not own this product');
  });

  it('throws not found when the product does not exist', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'approved' } as never);
    mockProduct.findFirst.mockResolvedValueOnce(null as never);

    await expect(
      ProductsService.getVendorProductById('user-1', 'missing')
    ).rejects.toThrow('Product not found');
  });

  it('rejects when the caller has no vendor profile', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce(null as never);

    await expect(
      ProductsService.getVendorProductById('user-1', 'p1')
    ).rejects.toThrow('Vendor profile not found');
  });

  it('rejects when the vendor is not approved', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'pending' } as never);

    await expect(
      ProductsService.getVendorProductById('user-1', 'p1')
    ).rejects.toThrow('Only approved vendors can manage products');
  });
});
