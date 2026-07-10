import { z } from 'zod';

const LocalizedStringSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  ar: z.string().min(1, 'Arabic text is required'),
});

// Optional localized text — empty strings allowed
const OptionalLocalizedStringSchema = z.object({
  en: z.string().optional().default(''),
  ar: z.string().optional().default(''),
});

// Accepts absolute http(s) URLs OR site-relative paths like "/products/phones"
const LinkUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (v) => v.startsWith('/') || z.string().url().safeParse(v).success,
    { message: 'Link must be a valid URL or a relative path starting with /' }
  );

// Image URL may be an absolute URL or a relative upload path like
// "/uploads/banners/xyz.webp" returned by the upload endpoint.
const ImageUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (v) => v.startsWith('/') || z.string().url().safeParse(v).success,
    { message: 'Invalid image URL' }
  );

export const CreateBannerSchema = z.object({
  title: LocalizedStringSchema,
  description: OptionalLocalizedStringSchema.optional(),
  imageUrl: ImageUrlSchema,
  imagePublicId: z.string().optional().default(''),
  linkUrl: LinkUrlSchema.optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const UpdateBannerSchema = z.object({
  id: z.string().min(1, 'Banner ID is required'),
});

export const UpdateBannerBodySchema = z.object({
  title: LocalizedStringSchema.optional(),
  description: OptionalLocalizedStringSchema.optional(),
  imageUrl: ImageUrlSchema.optional(),
  imagePublicId: z.string().min(1).optional(),
  linkUrl: LinkUrlSchema.optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const ReorderBannerSchema = z.object({
  bannerIds: z.array(z.string()).min(1, 'At least one banner ID is required'),
});

export const ToggleBannerSchema = z.object({
  id: z.string().min(1, 'Banner ID is required'),
});
