import { z } from 'zod';
import { LoyaltyTransactionType } from '@prisma/client';

export const UpdateLoyaltySettingsSchema = z
  .object({
    isEnabled:            z.boolean().optional(),
    earnRatePercent:      z.number().min(0).max(100).optional(),
    pointValue:           z.number().positive().optional(),
    minRedemptionPoints:  z.number().int().min(0).optional(),
    maxRedemptionPercent:  z.number().min(0).max(100).optional(),
    // 0 = points never expire
    pointsExpireAfterDays: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
  });

export const LoyaltyTransactionsQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type:  z.nativeEnum(LoyaltyTransactionType).optional(),
});

export const AdminLoyaltyUserQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});
