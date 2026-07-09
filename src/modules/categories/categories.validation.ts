import { z } from 'zod';

// ─── Reusable ─────────────────────────────────────────────────────────────────
const localizedStringSchema = z.object({
  en: z.string().min(1, 'English value is required'),
  ar: z.string().min(1, 'Arabic value is required'),
});

const optionalLocalizedStringSchema = z
  .object({
    en: z.string().min(1),
    ar: z.string().min(1),
  })
  .optional();

// ─── Create ───────────────────────────────────────────────────────────────────
export const CreateCategorySchema = z.object({
  name: localizedStringSchema.refine(
    (v) => v.en.length >= 2 && v.en.length <= 100,
    { message: 'Category name must be between 2 and 100 characters' }
  ),
  description: optionalLocalizedStringSchema,
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  image: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

// ─── Update ───────────────────────────────────────────────────────────────────
export const UpdateCategorySchema = z
  .object({
    name: optionalLocalizedStringSchema,
    description: optionalLocalizedStringSchema,
    // Allow null to move to top-level, uuid string to re-parent
    parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
    image: z.string().min(1).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Params ───────────────────────────────────────────────────────────────────
export const CategoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
});

export const CategorySlugParamSchema = z.object({
  slug: z.string().min(1),
});
