import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@shared/utils/ApiError';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    promoBanner: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import * as PromoBannersService from '@modules/promo-banners/promo-banners.service';
import { prisma } from '@database/prisma/client';

const mockPromo = vi.mocked(prisma.promoBanner);

describe('PromoBannersService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getActivePromoBanners returns only active, ordered, with the public shape', async () => {
    mockPromo.findMany.mockResolvedValueOnce([{ id: 'p1' }] as never);

    const result = await PromoBannersService.getActivePromoBanners();

    expect(mockPromo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: expect.objectContaining({
          id: true, title: true, subtitle: true, ctaText: true,
          linkUrl: true, gradient: true, order: true,
        }),
      })
    );
    expect(result).toEqual([{ id: 'p1' }]);
  });

  it('createPromoBanner persists localized fields and defaults', async () => {
    mockPromo.create.mockResolvedValueOnce({ id: 'p1' } as never);

    await PromoBannersService.createPromoBanner({
      title: { en: 'Sale', ar: 'تخفيض' },
      linkUrl: '/deals',
    });

    const arg = mockPromo.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.title).toEqual({ en: 'Sale', ar: 'تخفيض' });
    expect(arg.data.linkUrl).toBe('/deals');
    expect(arg.data.order).toBe(0);
    expect(arg.data.isActive).toBe(true);
  });

  it('updatePromoBanner throws 404 when the banner does not exist', async () => {
    mockPromo.findUnique.mockResolvedValueOnce(null);
    await expect(
      PromoBannersService.updatePromoBanner('missing', { order: 2 })
    ).rejects.toThrow(ApiError);
  });

  it('deletePromoBanner removes an existing banner', async () => {
    mockPromo.findUnique.mockResolvedValueOnce({ id: 'p1' } as never);
    mockPromo.delete.mockResolvedValueOnce({ id: 'p1' } as never);

    await PromoBannersService.deletePromoBanner('p1');

    expect(mockPromo.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });
});
