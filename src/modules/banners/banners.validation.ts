import { z } from 'zod';
import { imageUrlSchema } from '@shared/validation/imageUrl';

const LocalizedStringSchema = z.object({
  en: z.string().optional().default(''),
  ar: z.string().optional().default(''),
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

const BannerButtonStyleSchema = z.enum(['primary', 'outline']);
const BannerTextAlignSchema = z.enum(['right', 'center', 'left']);

export const CreateBannerSchema = z
  .object({
    title: LocalizedStringSchema,
    description: OptionalLocalizedStringSchema.optional(),
    imageUrl: imageUrlSchema(),
    imagePublicId: z.string().optional().default(''),
    linkUrl: LinkUrlSchema.optional().nullable(),
    showButton: z.boolean().optional().default(true),
    buttonText: OptionalLocalizedStringSchema.optional(),
    buttonStyle: BannerButtonStyleSchema.optional().default('primary'),
    textAlign: BannerTextAlignSchema.optional().default('right'),
    order: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
  })
  .refine((data) => !data.showButton || !!data.linkUrl, {
    message: 'linkUrl is required when showButton is enabled',
    path: ['linkUrl'],
  });

export const UpdateBannerSchema = z.object({
  id: z.string().min(1, 'Banner ID is required'),
});

export const UpdateBannerBodySchema = z
  .object({
    title: LocalizedStringSchema.optional(),
    description: OptionalLocalizedStringSchema.optional(),
    imageUrl: imageUrlSchema().optional(),
    imagePublicId: z.string().min(1).optional(),
    linkUrl: LinkUrlSchema.optional().nullable(),
    showButton: z.boolean().optional(),
    buttonText: OptionalLocalizedStringSchema.optional(),
    buttonStyle: BannerButtonStyleSchema.optional(),
    textAlign: BannerTextAlignSchema.optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
  })
  .refine((data) => !data.showButton || !!data.linkUrl, {
    message: 'linkUrl is required when showButton is enabled',
    path: ['linkUrl'],
  });

export const ReorderBannerSchema = z.object({
  bannerIds: z.array(z.string()).min(1, 'At least one banner ID is required'),
});

export const ToggleBannerSchema = z.object({
  id: z.string().min(1, 'Banner ID is required'),
});
