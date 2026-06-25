import { z } from 'zod';

const LocalizedStringSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  ar: z.string().min(1, 'Arabic text is required'),
});

export const CreateBannerSchema = z.object({
  title: LocalizedStringSchema,
  description: LocalizedStringSchema,
  imageUrl: z.string().url('Invalid image URL'),
  imagePublicId: z.string().min(1, 'Image public ID is required'),
  linkUrl: z.string().url('Invalid link URL').optional().nullable(),
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
  description: LocalizedStringSchema.optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  imagePublicId: z.string().min(1).optional(),
  linkUrl: z.string().url('Invalid link URL').optional().nullable(),
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
