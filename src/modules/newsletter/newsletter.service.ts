import { prisma } from '@database/prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// subscribe  —  idempotent: subscribing an already-subscribed email is a no-op
// that still resolves successfully (never an error).
// ─────────────────────────────────────────────────────────────────────────────
export const subscribe = async (email: string): Promise<{ subscribed: true }> => {
  await prisma.newsletterSubscriber.upsert({
    where:  { email },
    create: { email },
    update: {},   // already subscribed — nothing to change
  });
  return { subscribed: true };
};
