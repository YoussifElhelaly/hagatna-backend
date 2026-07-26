import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    vendorProfile: { findUnique: vi.fn() },
    review: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import * as ReviewsService from '@modules/reviews/reviews.service';
import { prisma } from '@database/prisma/client';

const mockVendorProfile = vi.mocked(prisma.vendorProfile);
const mockReview = vi.mocked(prisma.review);

describe('ReviewsService.replyToReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the review with the vendor reply when the vendor owns it', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockReview.findFirst.mockResolvedValueOnce({ id: 'rev1', vendorId: 'vendor-1' } as never);
    mockReview.update.mockResolvedValueOnce({ id: 'rev1', vendorReply: 'شكراً' } as never);

    const result = await ReviewsService.replyToReview('user-1', 'rev1', 'شكراً');

    expect(mockReview.update).toHaveBeenCalledWith({
      where: { id: 'rev1' },
      data: { vendorReply: 'شكراً', vendorRepliedAt: expect.any(Date) },
      select: expect.any(Object),
    });
    expect(result).toEqual({ id: 'rev1', vendorReply: 'شكراً' });
  });

  it('rejects when the review belongs to a different vendor', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockReview.findFirst.mockResolvedValueOnce({ id: 'rev1', vendorId: 'vendor-2' } as never);

    await expect(
      ReviewsService.replyToReview('user-1', 'rev1', 'شكراً')
    ).rejects.toThrow('You do not own this review');
    expect(mockReview.update).not.toHaveBeenCalled();
  });

  it('throws not found when the review does not exist', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce({ id: 'vendor-1' } as never);
    mockReview.findFirst.mockResolvedValueOnce(null as never);

    await expect(
      ReviewsService.replyToReview('user-1', 'missing', 'شكراً')
    ).rejects.toThrow('Review not found');
  });

  it('rejects when the caller has no vendor profile', async () => {
    mockVendorProfile.findUnique.mockResolvedValueOnce(null as never);

    await expect(
      ReviewsService.replyToReview('user-1', 'rev1', 'شكراً')
    ).rejects.toThrow('Vendor profile not found');
  });
});
