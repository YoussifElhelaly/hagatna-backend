import { z } from 'zod';

const LocalizedStringSchema = z.object({
  en: z.string().min(1).max(200),
  ar: z.string().min(1).max(200),
});

// ─── Create ───────────────────────────────────────────────────────────────────
export const CreateVendorPlanSchema = z.object({
  name:        LocalizedStringSchema,
  description: z.object({ en: z.string(), ar: z.string() }).optional(),
  maxProducts: z.number().int().positive().optional(),
  categoryIds: z.array(z.string().uuid()).min(1, 'At least one category is required'),
  isActive:    z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
});

// ─── Update ───────────────────────────────────────────────────────────────────
export const UpdateVendorPlanSchema = z.object({
  name:        LocalizedStringSchema.optional(),
  description: z.object({ en: z.string(), ar: z.string() }).optional(),
  maxProducts: z.number().int().positive().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).min(1).optional(),
  isActive:    z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
});

// ─── Params / Query ───────────────────────────────────────────────────────────
export const VendorPlanIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const VendorPlansListQuerySchema = z.object({
  page:     z.coerce.number().int().positive().optional(),
  limit:    z.coerce.number().int().min(1).max(100).optional(),
  search:   z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});
