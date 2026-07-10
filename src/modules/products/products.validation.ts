import { z } from 'zod';
import { ProductStatus } from '@prisma/client';
import { imageUrlSchema } from '@shared/validation/imageUrl';

// ─── Reusable ─────────────────────────────────────────────────────────────────
const localizedStringSchema = z.object({
  en: z.string().min(1, 'English value is required'),
  ar: z.string().min(1, 'Arabic value is required'),
});

const optionalLocalizedStringSchema = z
  .object({ en: z.string().min(1), ar: z.string().min(1) })
  .optional();

const positiveDecimal = z
  .number()
  .positive('Must be greater than 0')
  .multipleOf(0.01, 'Max 2 decimal places');

// ─── Variant ──────────────────────────────────────────────────────────────────
const ProductVariantSchema = z.object({
  name: z.string().min(1).max(100),
  options: z.record(z.string(), z.string()).refine(
    (v) => Object.keys(v).length > 0,
    { message: 'Variant options cannot be empty' }
  ),
  price: positiveDecimal,
  comparePrice: positiveDecimal.optional(),
  sku: z.string().max(100).optional(),
  stockQuantity: z.number().int().min(0).optional().default(0),
  imageUrl: imageUrlSchema().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateVariantSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    options: z
      .record(z.string(), z.string())
      .refine((v) => Object.keys(v).length > 0)
      .optional(),
    price: positiveDecimal.optional(),
    comparePrice: positiveDecimal.nullable().optional(),
    sku: z.string().max(100).nullable().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    imageUrl: imageUrlSchema().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Image ────────────────────────────────────────────────────────────────────
const ProductImageSchema = z.object({
  url: imageUrlSchema(),
  altText: z.string().max(255).optional(),
  isPrimary: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const SetProductImagesSchema = z.object({
  images: z.array(ProductImageSchema).min(1, 'At least one image is required').max(10),
});

// ─── Create Product ───────────────────────────────────────────────────────────
export const CreateProductSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: localizedStringSchema.refine(
    (v) => v.en.length >= 2 && v.en.length <= 200,
    { message: 'Product name must be between 2 and 200 characters' }
  ),
  description: optionalLocalizedStringSchema,
  price: positiveDecimal,
  comparePrice: positiveDecimal.optional(),
  costPrice: positiveDecimal.optional(),
  dealEndsAt: z.coerce.date().optional(),
  brandId: z.string().uuid('Invalid brand ID').optional(),
  shippingClassId: z.string().uuid().optional(),
  sku: z.string().max(100).optional(),
  stockQuantity: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  variants: z.array(ProductVariantSchema).optional().default([]),
  images: z.array(ProductImageSchema).optional().default([]),
  tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
}).refine(
  (data) => !data.comparePrice || data.comparePrice > data.price,
  { message: 'Compare price must be greater than the selling price', path: ['comparePrice'] }
);

// ─── Update Product ───────────────────────────────────────────────────────────
export const UpdateProductSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    name: optionalLocalizedStringSchema,
    description: optionalLocalizedStringSchema,
    price: positiveDecimal.optional(),
    comparePrice: positiveDecimal.nullable().optional(),
    costPrice: positiveDecimal.nullable().optional(),
    dealEndsAt: z.coerce.date().nullable().optional(),
    brandId: z.string().uuid('Invalid brand ID').nullable().optional(),
    shippingClassId: z.string().uuid().nullable().optional(),
    sku: z.string().max(100).nullable().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Status Update ────────────────────────────────────────────────────────────
// Vendor can only move to these statuses — cannot approve own products
export const UpdateProductStatusSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'archived'] as const, {
    errorMap: () => ({
      message: "Status must be 'draft', 'pending_approval', or 'archived'",
    }),
  }),
});

// Admin approve / reject
export const RejectProductSchema = z.object({
  approvalNote: z.string().min(1, 'Rejection note is required').max(500),
});

// Admin product list query
export const AdminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(ProductStatus).optional(),
  vendorId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

// ─── Admin Create / Update ───────────────────────────────────────────────────
// Admin can specify vendorId and set any status (including 'active')
// Note: CreateProductSchema already has a .refine(), so we reconstruct using z.intersection
export const AdminCreateProductSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.draft),
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.object({ en: z.string().min(2).max(200), ar: z.string().min(1) }),
  description: z.object({ en: z.string().min(1), ar: z.string().min(1) }).optional(),
  price: z.number().positive().multipleOf(0.01),
  comparePrice: z.number().positive().multipleOf(0.01).optional(),
  costPrice: z.number().positive().multipleOf(0.01).optional(),
  dealEndsAt: z.coerce.date().optional(),
  brandId: z.string().uuid('Invalid brand ID').optional(),
  shippingClassId: z.string().uuid().optional(),
  sku: z.string().max(100).optional(),
  stockQuantity: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  variants: z.array(ProductVariantSchema).optional().default([]),
  images: z.array(ProductImageSchema).max(10).optional().default([]),
  tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
}).refine(
  (data) => !data.comparePrice || data.comparePrice > data.price,
  { message: 'Compare price must be greater than the selling price', path: ['comparePrice'] }
);

// Admin update: all UpdateProduct fields + optional status override + images replacement
export const AdminUpdateProductSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    name: z.object({ en: z.string().min(1), ar: z.string().min(1) }).optional(),
    description: z.object({ en: z.string().min(1), ar: z.string().min(1) }).optional(),
    price: z.number().positive().multipleOf(0.01).optional(),
    comparePrice: z.number().positive().multipleOf(0.01).nullable().optional(),
    costPrice: z.number().positive().multipleOf(0.01).nullable().optional(),
    dealEndsAt: z.coerce.date().nullable().optional(),
    brandId: z.string().uuid('Invalid brand ID').nullable().optional(),
    shippingClassId: z.string().uuid().nullable().optional(),
    sku: z.string().max(100).nullable().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    images: z.array(ProductImageSchema).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Bulk Update ──────────────────────────────────────────────────────────────
const vendorBulkUpdateFields = z.object({
  price: positiveDecimal.optional(),
  comparePrice: positiveDecimal.nullable().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending_approval', 'archived'] as const).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one update field is required' });

export const BulkUpdateProductsSchema = z.object({
  ids: z.array(z.string().uuid('Invalid product ID')).min(1).max(100, 'Max 100 products per request'),
  update: vendorBulkUpdateFields,
});

export const AdminBulkUpdateProductsSchema = z.object({
  ids: z.array(z.string().uuid('Invalid product ID')).min(1).max(100, 'Max 100 products per request'),
  update: z.object({
    price: positiveDecimal.optional(),
    comparePrice: positiveDecimal.nullable().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    categoryId: z.string().uuid().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    isFeatured: z.boolean().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'At least one update field is required' }),
});

// ─── Params ───────────────────────────────────────────────────────────────────
export const ProductIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export const ProductSlugParamSchema = z.object({
  slug: z.string().min(1),
});

export const ProductVariantParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID'),
});

// ─── List Queries ─────────────────────────────────────────────────────────────
export const ProductsListQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).optional().default(1),
  limit:      z.coerce.number().int().min(1).max(100).optional().default(20),
  categoryId: z.string().uuid().optional(),
  vendorId:   z.string().uuid().optional(),
  brand:      z.string().min(1).max(150).optional(),   // brand slug or id
  minPrice:   z.coerce.number().positive().optional(),
  maxPrice:   z.coerce.number().positive().optional(),
  search:     z.string().max(100).optional(),
  tag:        z.string().max(50).optional(),
  isFeatured: z.coerce.boolean().optional(),
  onSale:     z.coerce.boolean().optional(),
  sort: z
    .enum(['price_asc', 'price_desc', 'newest', 'popular'])
    .optional()
    .default('newest'),
  // Dynamic attribute filters: attrs[ram]=8GB&attrs[color]=Black
  // Express parses nested bracket notation as an object automatically
  attrs: z.record(z.string().min(1).max(60), z.string().max(255)).optional(),
});

export const VendorProductsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(ProductStatus).optional(),
  search: z.string().max(100).optional(),
});
