import { z } from 'zod';
import { PromotionType, DiscountType } from '@prisma/client';

const localizedStringSchema = z.object({
  en: z.string().min(1, 'English value is required'),
  ar: z.string().min(1, 'Arabic value is required'),
});

const optionalLocalizedStringSchema = z
  .object({ en: z.string().min(1), ar: z.string().min(1) })
  .optional();

// ─── Create ───────────────────────────────────────────────────────────────────
export const CreatePromotionSchema = z
  .object({
    name: localizedStringSchema,
    type: z.nativeEnum(PromotionType),
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/, 'Coupon code must be uppercase alphanumeric (A-Z, 0-9, _, -)')
      .optional(),
    discountType: z.nativeEnum(DiscountType),
    discountValue: z.number().positive('Discount value must be positive'),
    minPurchaseAmount: z.number().min(0).optional().default(0),
    maxDiscountAmount: z.number().positive().optional(),
    usageLimitTotal: z.number().int().positive().optional(),
    usageLimitPerUser: z.number().int().min(1).optional().default(1),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }).optional(),
    isActive: z.boolean().optional().default(true),
    vendorId: z.string().uuid().optional(),
    categoryIds: z.array(z.string().uuid()).optional().default([]),   // empty = all categories
  })
  .refine(
    (d) => d.type !== PromotionType.coupon || !!d.code,
    { message: 'A coupon code is required for coupon-type promotions', path: ['code'] }
  )
  .refine(
    (d) => !d.endsAt || new Date(d.endsAt) > new Date(d.startsAt),
    { message: 'endsAt must be after startsAt', path: ['endsAt'] }
  )
  .refine(
    (d) => d.discountType !== DiscountType.percentage || d.discountValue <= 100,
    { message: 'Percentage discount cannot exceed 100', path: ['discountValue'] }
  );

// ─── Update ───────────────────────────────────────────────────────────────────
export const UpdatePromotionSchema = z
  .object({
    name: optionalLocalizedStringSchema,
    discountValue: z.number().positive().optional(),
    minPurchaseAmount: z.number().min(0).optional(),
    maxDiscountAmount: z.number().positive().nullable().optional(),
    usageLimitTotal: z.number().int().positive().nullable().optional(),
    usageLimitPerUser: z.number().int().min(1).optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).nullable().optional(),
    isActive: z.boolean().optional(),
    categoryIds: z.array(z.string().uuid()).optional(),   // empty = all categories
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ─── Params ───────────────────────────────────────────────────────────────────
export const PromotionIdParamSchema = z.object({
  id: z.string().uuid('Invalid promotion ID'),
});

// ─── List query ───────────────────────────────────────────────────────────────
export const PromotionsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.nativeEnum(PromotionType).optional(),
  isActive: z.coerce.boolean().optional(),
  vendorId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

// ─── Validate coupon (authenticated query) ────────────────────────────────────
export const ValidateCouponQuerySchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((v) => v.toUpperCase()),
  subtotal: z.coerce.number().min(0).optional().default(0),
});
