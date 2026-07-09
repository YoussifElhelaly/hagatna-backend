import { z } from 'zod';

const LocalizedStringSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  ar: z.string().min(1, 'Arabic text is required'),
});

const OptionalLocalizedStringSchema = z.object({
  en: z.string().optional().default(''),
  ar: z.string().optional().default(''),
});

// Absolute http(s) URL OR a site-relative path like "/deals"
const LinkUrlSchema = z
  .string()
  .max(500)
  .refine(
    (v) => v.startsWith('/') || z.string().url().safeParse(v).success,
    { message: 'Link must be a valid URL or a relative path starting with /' }
  );

export const CreatePromoBannerSchema = z.object({
  title: LocalizedStringSchema,
  subtitle: OptionalLocalizedStringSchema.optional(),
  ctaText: OptionalLocalizedStringSchema.optional(),
  linkUrl: LinkUrlSchema.optional().nullable(),
  gradient: z.string().max(255).optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const UpdatePromoBannerSchema = z.object({
  title: LocalizedStringSchema.optional(),
  subtitle: OptionalLocalizedStringSchema.optional(),
  ctaText: OptionalLocalizedStringSchema.optional(),
  linkUrl: LinkUrlSchema.optional().nullable(),
  gradient: z.string().max(255).optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const PromoBannerIdParamSchema = z.object({
  id: z.string().uuid('Invalid promo banner ID'),
});
