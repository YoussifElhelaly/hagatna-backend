import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  ProductsListQuerySchema,
  VendorProductsListQuerySchema,
  AdminProductsQuerySchema,
  AdminListProductsQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  AdminCreateProductSchema,
  AdminUpdateProductSchema,
  UpdateProductStatusSchema,
  RejectProductSchema,
  BulkUpdateProductsSchema,
  AdminBulkUpdateProductsSchema,
  ProductIdParamSchema,
  ProductSlugParamSchema,
  ProductVariantParamSchema,
  UpdateVariantSchema,
  SetProductImagesSchema,
} from './products.validation';
import * as ProductsController from './products.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: static paths MUST come before dynamic params.
// Order: /featured → /admin/queue → /vendor/me → /:id/* → /:slug
// ─────────────────────────────────────────────────────────────────────────────

// ─── Public ───────────────────────────────────────────────────────────────────

// GET  /api/v1/products
router.get(
  '/',
  validate({ query: ProductsListQuerySchema }),
  ProductsController.listProducts
);

// GET  /api/v1/products/featured
router.get('/featured', ProductsController.getFeaturedProducts);

// ─── Admin — create / update any product ─────────────────────────────────────

// GET /api/v1/products/admin (admin lists all products)
router.get(
  '/admin',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: AdminListProductsQuerySchema }),
  ProductsController.adminListProducts
);

// POST  /api/v1/products/admin  (admin creates product for a vendor)
router.post(
  '/admin',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: AdminCreateProductSchema }),
  ProductsController.adminCreateProduct
);

// GET /api/v1/products/admin/import/template
router.get(
  '/admin/import/template',
  authenticate,
  authorize(ROLES.ADMIN),
  ProductsController.downloadImportTemplate
);

// POST /api/v1/products/admin/import
router.post(
  '/admin/import',
  authenticate,
  authorize(ROLES.ADMIN),
  multer({ storage: multer.memoryStorage() }).single('file'),
  ProductsController.importProducts
);


// GET  /api/v1/products/admin/:id  (admin fetches any product, full detail)
router.get(
  '/admin/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ProductIdParamSchema }),
  ProductsController.adminGetProduct
);

// PATCH /api/v1/products/admin/:id  (admin updates any product, any status)
router.patch(
  '/admin/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ProductIdParamSchema, body: AdminUpdateProductSchema }),
  ProductsController.adminUpdateProduct
);

// PATCH /api/v1/products/admin/bulk  (admin bulk update)
router.patch(
  '/admin/bulk',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: AdminBulkUpdateProductsSchema }),
  ProductsController.adminBulkUpdateProducts
);

// ─── Admin — product approval queue ──────────────────────────────────────────

// GET  /api/v1/products/admin/queue  (admin) — pending approval list
router.get(
  '/admin/queue',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: AdminProductsQuerySchema }),
  ProductsController.listPendingApproval
);

// PATCH /api/v1/products/:id/approve  (admin)
router.patch(
  '/:id/approve',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ProductIdParamSchema }),
  ProductsController.approveProduct
);

// PATCH /api/v1/products/:id/reject  (admin)
router.patch(
  '/:id/reject',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ProductIdParamSchema, body: RejectProductSchema }),
  ProductsController.rejectProduct
);

// PATCH /api/v1/products/:id/feature  (admin)
router.patch(
  '/:id/feature',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ProductIdParamSchema }),
  ProductsController.toggleFeatured
);

// ─── Vendor — own product management ─────────────────────────────────────────

// GET  /api/v1/products/vendor/me
router.get(
  '/vendor/me',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ query: VendorProductsListQuerySchema }),
  ProductsController.getVendorProducts
);

// PATCH /api/v1/products/bulk  (vendor bulk update own products)
router.patch(
  '/bulk',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ body: BulkUpdateProductsSchema }),
  ProductsController.bulkUpdateProducts
);

// POST /api/v1/products
router.post(
  '/',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ body: CreateProductSchema }),
  ProductsController.createProduct
);

// PATCH /api/v1/products/:id
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: ProductIdParamSchema, body: UpdateProductSchema }),
  ProductsController.updateProduct
);

// PATCH /api/v1/products/:id/status
// Vendor submits for review (draft → pending_approval) or archives
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: ProductIdParamSchema, body: UpdateProductStatusSchema }),
  ProductsController.updateProductStatus
);

// DELETE /api/v1/products/:id  (soft delete — vendor owns OR admin)
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.VENDOR, ROLES.ADMIN),
  validate({ params: ProductIdParamSchema }),
  ProductsController.deleteProduct
);

// ─── Vendor — variant management ─────────────────────────────────────────────

// POST /api/v1/products/:id/variants
router.post(
  '/:id/variants',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: ProductIdParamSchema }),
  ProductsController.addVariant
);

// PATCH /api/v1/products/:id/variants/:variantId
router.patch(
  '/:id/variants/:variantId',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: ProductVariantParamSchema, body: UpdateVariantSchema }),
  ProductsController.updateVariant
);

// DELETE /api/v1/products/:id/variants/:variantId  (soft delete)
router.delete(
  '/:id/variants/:variantId',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: ProductVariantParamSchema }),
  ProductsController.deleteVariant
);

// PUT /api/v1/products/:id/images  (full replacement — legacy, kept for compatibility)
router.put(
  '/:id/images',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: ProductIdParamSchema, body: SetProductImagesSchema }),
  ProductsController.setProductImages
);

// ─── Public — single product (last, catches :slug) ────────────────────────────

// GET  /api/v1/products/:slug
router.get(
  '/:slug',
  validate({ params: ProductSlugParamSchema }),
  ProductsController.getProductBySlug
);

export default router;
