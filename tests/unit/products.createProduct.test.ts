import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    vendorProfile: { findUnique: vi.fn() },
    category: { findFirst: vi.fn() },
    product: { create: vi.fn() },
  },
}));

vi.mock('@shared/utils/generateSlug', () => ({
  generateUniqueSlug: vi.fn(async () => 'cotton-shirt'),
}));

import * as ProductsService from '@modules/products/products.service';
import { prisma } from '@database/prisma/client';

const mockVendorProfile = vi.mocked(prisma.vendorProfile);
const mockCategory = vi.mocked(prisma.category);
const mockProduct = vi.mocked(prisma.product);

describe('ProductsService.createProduct', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always creates the product as pending_approval, ignoring any status a vendor might send', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'approved' } as never);
    mockCategory.findFirst.mockResolvedValueOnce({ id: 'cat-1' } as never);
    mockProduct.create.mockResolvedValueOnce({ id: 'p1', status: 'pending_approval' } as never);

    await ProductsService.createProduct('user-1', {
      categoryId: 'cat-1',
      name: { en: 'Cotton Shirt', ar: 'قميص قطن' },
      price: 100,
      status: 'active', // CreateProductInput has no status field — this must be ignored, not passed through
    } as never);

    expect(mockProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_approval' }),
      })
    );
  });
});
