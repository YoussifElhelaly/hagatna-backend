import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    brand: { findFirst: vi.fn() },
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      // sentinel used to assert the onSale field-reference comparison
      fields: { price: { __ref: 'products.price' } },
    },
    wishlist: { findMany: vi.fn() },
  },
}));

vi.mock('@database/redis/client', () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
  RedisKeys: { cache: { product: () => 'k', featuredProducts: () => 'k' } },
  TTL: { PRODUCT: 900, FEATURED: 600 },
}));

vi.mock('@modules/notifications/notifications.service', () => ({ notify: vi.fn() }));
vi.mock('@shared/utils/categoryTree', () => ({ getDescendantIds: vi.fn().mockResolvedValue([]) }));
vi.mock('@shared/utils/generateSlug', () => ({ generateUniqueSlug: vi.fn() }));

import * as ProductsService from '@modules/products/products.service';
import { prisma } from '@database/prisma/client';

const mockPrisma = vi.mocked(prisma, true);
const PRICE_FIELD_REF = (prisma.product as unknown as { fields: { price: unknown } }).fields.price;

describe('ProductsService.listProducts filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.findMany.mockResolvedValue([] as never);
    mockPrisma.product.count.mockResolvedValue(0 as never);
  });

  it('onSale=true filters where comparePrice > price (field reference)', async () => {
    await ProductsService.listProducts({ onSale: true } as never);

    const arg = mockPrisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.comparePrice).toEqual({ gt: PRICE_FIELD_REF });
  });

  it('does not add the onSale condition when omitted', async () => {
    await ProductsService.listProducts({} as never);

    const arg = mockPrisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.comparePrice).toBeUndefined();
  });

  it('brand filter resolves a slug/id to brandId', async () => {
    mockPrisma.brand.findFirst.mockResolvedValueOnce({ id: 'brand-uuid' } as never);

    await ProductsService.listProducts({ brand: 'apple' } as never);

    expect(mockPrisma.brand.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: 'apple' }, { slug: 'apple' }] },
      select: { id: true },
    });
    const arg = mockPrisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.brandId).toBe('brand-uuid');
  });

  it('unknown brand yields an empty result set (sentinel brandId)', async () => {
    mockPrisma.brand.findFirst.mockResolvedValueOnce(null as never);

    await ProductsService.listProducts({ brand: 'nope' } as never);

    const arg = mockPrisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.brandId).toBe('__no_match__');
  });
});
