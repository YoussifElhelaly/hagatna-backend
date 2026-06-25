import { z } from 'zod';

// ─── Customer: request a return ───────────────────────────────────────────────
export const requestReturnBody = z.object({
  orderNumber: z.string().min(1, 'orderNumber is required'),
  orderItemId: z.string().uuid('orderItemId must be a valid UUID').optional(),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)').max(1000),
});

// ─── Admin: reject a return ───────────────────────────────────────────────────
export const rejectReturnBody = z.object({
  note: z.string().min(1, 'Rejection note is required').max(500).optional(),
});

// ─── Admin: approve a return ──────────────────────────────────────────────────
export const approveReturnBody = z.object({
  refundAmount: z
    .number({ invalid_type_error: 'refundAmount must be a number' })
    .positive('refundAmount must be positive')
    .optional(), // if omitted → full order/item amount
});

// ─── Shared: list query ───────────────────────────────────────────────────────
export const listReturnsQuery = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
});
