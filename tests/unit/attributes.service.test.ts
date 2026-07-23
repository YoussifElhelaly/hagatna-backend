import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    product: { findFirst: vi.fn() },
    vendorProfile: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    attributeDefinition: { findMany: vi.fn() },
    productAttribute: { upsert: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import * as AttributesService from '@modules/attributes/attributes.service';
import { prisma } from '@database/prisma/client';

const mockProduct = vi.mocked(prisma.product);
const mockVendorProfile = vi.mocked(prisma.vendorProfile);
const mockCategory = vi.mocked(prisma.category);
const mockAttributeDefinition = vi.mocked(prisma.attributeDefinition);
const mockProductAttribute = vi.mocked(prisma.productAttribute);
const mockTransaction = vi.mocked(prisma.$transaction);

describe('AttributesService.setProductAttributes — ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  const setupCommon = () => {
    mockCategory.findUnique.mockResolvedValue({ parentId: null } as never);
    mockAttributeDefinition.findMany.mockResolvedValue([] as never);
    mockTransaction.mockResolvedValue([] as never);
    mockProductAttribute.findMany.mockResolvedValue([] as never);
  };

  it('allows a vendor to set attributes on their own product', async () => {
    setupCommon();
    mockProduct.findFirst.mockResolvedValueOnce({
      id: 'p1', categoryId: 'cat1', vendorId: 'vendor-1',
    } as never);
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);

    await expect(
      AttributesService.setProductAttributes('user-1', false, 'p1', {})
    ).resolves.toBeDefined();
  });

  it('rejects a vendor setting attributes on a product they do not own', async () => {
    setupCommon();
    mockProduct.findFirst.mockResolvedValueOnce({
      id: 'p1', categoryId: 'cat1', vendorId: 'vendor-2',
    } as never);
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);

    await expect(
      AttributesService.setProductAttributes('user-1', false, 'p1', {})
    ).rejects.toThrow('You do not own this product');
  });

  it('allows an admin to set attributes on any product without a vendor profile lookup', async () => {
    setupCommon();
    mockProduct.findFirst.mockResolvedValueOnce({
      id: 'p1', categoryId: 'cat1', vendorId: 'vendor-2',
    } as never);

    await expect(
      AttributesService.setProductAttributes('admin-1', true, 'p1', {})
    ).resolves.toBeDefined();
    expect(mockVendorProfile.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a vendor with no vendor profile', async () => {
    setupCommon();
    mockProduct.findFirst.mockResolvedValueOnce({
      id: 'p1', categoryId: 'cat1', vendorId: 'vendor-1',
    } as never);
    mockVendorProfile.findUnique.mockResolvedValueOnce(null as never);

    await expect(
      AttributesService.setProductAttributes('user-1', false, 'p1', {})
    ).rejects.toThrow('Vendor profile not found');
  });
});
