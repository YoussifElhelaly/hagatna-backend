import { z } from 'zod';
import { imageUrlSchema } from '@shared/validation/imageUrl';

const LocalizedRequired = z.object({
  en: z.string().min(1, 'English text is required'),
  ar: z.string().min(1, 'Arabic text is required'),
});

const LocalizedOptional = z.object({
  en: z.string().optional().default(''),
  ar: z.string().optional().default(''),
});

// A URL-safe slug: no spaces or slashes (Arabic letters allowed).
const SlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(200)
  .regex(/^[^\s/?#]+$/, 'Slug must not contain spaces or slashes');

export const CreateBlogPostSchema = z.object({
  slug: SlugSchema,
  title: LocalizedRequired,
  excerpt: LocalizedOptional.optional(),
  content: LocalizedOptional.optional(),
  coverImage: imageUrlSchema('Invalid cover image').optional().nullable(),
  metaTitle: LocalizedOptional.optional(),
  metaDescription: LocalizedOptional.optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  authorName: z.string().max(100).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

export const UpdateBlogPostSchema = CreateBlogPostSchema.partial();

export const BlogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(['draft', 'published']).optional(),
  search: z.string().max(100).optional(),
});
