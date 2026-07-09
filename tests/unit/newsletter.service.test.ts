import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@database/prisma/client', () => ({
  prisma: {
    newsletterSubscriber: {
      upsert: vi.fn(),
    },
  },
}));

import * as NewsletterService from '@modules/newsletter/newsletter.service';
import { prisma } from '@database/prisma/client';

const mockSubscriber = vi.mocked(prisma.newsletterSubscriber);

describe('NewsletterService.subscribe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts the email and returns { subscribed: true }', async () => {
    mockSubscriber.upsert.mockResolvedValueOnce({
      id: 'sub-1',
      email: 'a@b.com',
      createdAt: new Date(),
    } as never);

    const result = await NewsletterService.subscribe('a@b.com');

    expect(result).toEqual({ subscribed: true });
    expect(mockSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
      create: { email: 'a@b.com' },
      update: {},
    });
  });

  it('is idempotent — an already-subscribed email still resolves successfully', async () => {
    // upsert with empty update never throws for an existing row
    mockSubscriber.upsert.mockResolvedValueOnce({
      id: 'sub-1',
      email: 'a@b.com',
      createdAt: new Date(),
    } as never);

    await expect(NewsletterService.subscribe('a@b.com')).resolves.toEqual({
      subscribed: true,
    });
  });
});
