import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

export const ListPayoutsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(PaymentStatus).optional(),
  vendorId: z.string().uuid('Invalid vendor ID').optional(),
});

export const PayoutIdParamSchema = z.object({
  id: z.string().uuid('Invalid payout ID'),
});

export const CommissionsSummaryQuerySchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID').optional(),
});
