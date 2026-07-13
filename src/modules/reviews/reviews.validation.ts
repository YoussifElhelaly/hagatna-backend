import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';
import { imageUrlSchema } from '@shared/validation/imageUrl';

// ─── Create ───────────────────────────────────────────────────────────────────
export const CreateReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  orderId: z.string().uuid('Invalid order ID').optional(),
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Minimum rating is 1')
    .max(5, 'Maximum rating is 5'),
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(10, 'Review must be at least 10 characters').max(2000).optional(),
  media: z
    .array(
      z.object({
        url: imageUrlSchema('Invalid media URL'),
        type: z.enum(['image', 'video']),
      })
    )
    .max(5, 'Maximum 5 media attachments')
    .optional()
    .default([]),
});

// ─── Admin authored (testimonial) ─────────────────────────────────────────────
export const AdminCreateReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  authorName: z.string().trim().min(2, 'Author name is required').max(100),
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Minimum rating is 1')
    .max(5, 'Maximum rating is 5'),
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(3).max(2000).optional(),
});

// ─── Update ───────────────────────────────────────────────────────────────────
export const UpdateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().min(3).max(255).optional(),
    content: z.string().min(10).max(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ─── Params ───────────────────────────────────────────────────────────────────
export const ReviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid review ID'),
});

export const ProductSlugParamSchema = z.object({
  productSlug: z.string().min(1),
});

// ─── List queries ─────────────────────────────────────────────────────────────
export const ProductReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  sort: z
    .enum(['newest', 'oldest', 'highest', 'lowest', 'helpful'])
    .optional()
    .default('newest'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const AdminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(ReviewStatus).optional(),
  productId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
});
