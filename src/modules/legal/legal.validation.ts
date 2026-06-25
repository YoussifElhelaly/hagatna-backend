import { z } from 'zod';

const LocalizedStringSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  ar: z.string().min(1, 'Arabic text is required'),
});

export const CreateLegalPageSchema = z.object({
  type: z.enum(['terms', 'privacy'], {
    errorMap: () => ({ message: 'Type must be "terms" or "privacy"' }),
  }),
  audience: z.enum(['vendor', 'customer'], {
    errorMap: () => ({ message: 'Audience must be "vendor" or "customer"' }),
  }),
  title: LocalizedStringSchema,
  content: LocalizedStringSchema,
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  isActive: z.boolean().optional().default(true),
});

export const UpdateLegalPageSchema = z.object({
  id: z.string().min(1, 'Page ID is required'),
});

export const UpdateLegalPageBodySchema = z.object({
  title: LocalizedStringSchema.optional(),
  content: LocalizedStringSchema.optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  isActive: z.boolean().optional(),
});

export const GetLegalPageSchema = z.object({
  type: z.enum(['terms', 'privacy'], {
    errorMap: () => ({ message: 'Type must be "terms" or "privacy"' }),
  }),
  audience: z.enum(['vendor', 'customer'], {
    errorMap: () => ({ message: 'Audience must be "vendor" or "customer"' }),
  }),
});
