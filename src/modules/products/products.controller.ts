import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as ProductsService from './products.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /products  (public) ──────────────────────────────────────────────────
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { id?: string } | undefined)?.id;
  const { products, meta } = await ProductsService.listProducts(req.query as never, userId);
  sendSuccess({ res, message: 'Products retrieved', data: products, meta });
});

// ─── GET /products/featured  (public) ────────────────────────────────────────
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { id?: string } | undefined)?.id;
  const products = await ProductsService.getFeaturedProducts(userId);
  sendSuccess({ res, message: 'Featured products retrieved', data: products });
});

// ─── GET /products/vendor/me  (vendor) ───────────────────────────────────────
export const getVendorProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, meta } = await ProductsService.getVendorProducts(
    req.user!.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Your products retrieved', data: products, meta });
});

// ─── GET /products/:slug  (public) ───────────────────────────────────────────
export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { id?: string } | undefined)?.id;
  const product = await ProductsService.getProductBySlug(req.params.slug, userId);
  sendSuccess({ res, message: 'Product retrieved', data: product });
});

// ─── POST /products  (vendor) ─────────────────────────────────────────────────
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.createProduct(req.user!.id, req.body);
  logActivity({
    userId: req.user!.id,
    role: 'vendor',
    category: 'product',
    action: 'create_product',
    entityType: 'product',
    entityId: (product as any).id,
    entityLabel: (product.name as any)?.en || String(product.name),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendCreated(res, 'Product created successfully', product);
});

// ─── PATCH /products/:id  (vendor) ───────────────────────────────────────────
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.updateProduct(
    req.user!.id,
    req.params.id,
    req.body
  );
  logActivity({
    userId: req.user!.id,
    role: 'vendor',
    category: 'product',
    action: 'update_product',
    entityType: 'product',
    entityId: req.params.id,
    entityLabel: (product.name as any)?.en || String(product.name),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Product updated successfully', data: product });
});

// ─── PATCH /products/:id/status  (vendor) ────────────────────────────────────
export const updateProductStatus = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.updateProductStatus(
    req.user!.id,
    req.params.id,
    req.body.status
  );
  sendSuccess({ res, message: 'Product status updated', data: product });
});

// ─── DELETE /products/:id  (vendor or admin) ─────────────────────────────────
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  await ProductsService.deleteProduct(req.user!.id, req.params.id, isAdmin);
  logActivity({
    userId: req.user!.id,
    role: isAdmin ? 'admin' : 'vendor',
    category: 'product',
    action: 'delete_product',
    entityType: 'product',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Product deleted successfully', data: null });
});

// ─── PATCH /products/:id/feature  (admin) ────────────────────────────────────
export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.toggleFeatured(req.params.id);
  sendSuccess({ res, message: `Product ${product.isFeatured ? 'featured' : 'unfeatured'}`, data: product });
});

// ─── GET /products/admin/queue  (admin) — pending approval list ──────────────
export const listPendingApproval = asyncHandler(async (req: Request, res: Response) => {
  const { products, meta } = await ProductsService.listPendingApproval(req.query as never);
  sendSuccess({ res, message: 'Pending products retrieved', data: products, meta });
});

// ─── PATCH /products/:id/approve  (admin) ────────────────────────────────────
export const approveProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.approveProduct(req.params.id);
  logActivity({ userId: req.user!.id, role: 'admin', category: 'product', action: 'approve_product', entityType: 'product', entityId: req.params.id, entityLabel: (product.name as any)?.en || String(product.name), ipAddress: req.ip, userAgent: req.get('user-agent') });
  sendSuccess({ res, message: 'Product approved and published', data: product });
});

// ─── PATCH /products/:id/reject  (admin) ─────────────────────────────────────
export const rejectProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.rejectProduct(req.params.id, req.body.approvalNote);
  logActivity({ userId: req.user!.id, role: 'admin', category: 'product', action: 'reject_product', entityType: 'product', entityId: req.params.id, entityLabel: (product.name as any)?.en || String(product.name), metadata: { note: req.body.approvalNote }, ipAddress: req.ip, userAgent: req.get('user-agent') });
  sendSuccess({ res, message: 'Product rejected', data: product });
});

// ─── POST /products/admin  (admin creates for any vendor) ────────────────────
export const adminCreateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.adminCreateProduct(req.body);
  sendCreated(res, 'Product created successfully', product);
});

// ─── GET /products/admin/:id  (admin fetches any product, full detail) ───────
export const adminGetProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.adminGetProduct(req.params.id);
  sendSuccess({ res, message: 'Product retrieved', data: product });
});

// ─── GET /products/admin (admin list products) ──────────────────────────────
export const adminListProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, meta } = await ProductsService.adminListProducts(req.query as never);
  sendSuccess({ res, message: 'Products retrieved', data: products, meta });
});

// ─── PATCH /products/admin/:id  (admin updates any product) ──────────────────
export const adminUpdateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductsService.adminUpdateProduct(req.params.id, req.body);
  sendSuccess({ res, message: 'Product updated successfully', data: product });
});

// ─── POST /products/:id/variants  (vendor) ───────────────────────────────────
export const addVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await ProductsService.addVariant(req.user!.id, req.params.id, req.body);
  sendCreated(res, 'Variant added successfully', variant);
});

// ─── PATCH /products/:id/variants/:variantId  (vendor) ───────────────────────
export const updateVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await ProductsService.updateVariant(
    req.user!.id,
    req.params.id,
    req.params.variantId,
    req.body
  );
  sendSuccess({ res, message: 'Variant updated successfully', data: variant });
});

// ─── DELETE /products/:id/variants/:variantId  (vendor) ──────────────────────
export const deleteVariant = asyncHandler(async (req: Request, res: Response) => {
  await ProductsService.deleteVariant(req.user!.id, req.params.id, req.params.variantId);
  sendSuccess({ res, message: 'Variant deleted successfully', data: null });
});

// ─── PATCH /products/bulk  (vendor) ──────────────────────────────────────────
export const bulkUpdateProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await ProductsService.bulkUpdateProducts(
    req.user!.id,
    req.body.ids,
    req.body.update,
    false
  );
  sendSuccess({ res, message: `${result.updated} products updated`, data: result });
});

// ─── PATCH /products/admin/bulk  (admin) ─────────────────────────────────────
export const adminBulkUpdateProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await ProductsService.bulkUpdateProducts(
    req.user!.id,
    req.body.ids,
    req.body.update,
    true
  );
  sendSuccess({ res, message: `${result.updated} products updated`, data: result });
});

// ─── PUT /products/:id/images  (vendor) ──────────────────────────────────────
export const setProductImages = asyncHandler(async (req: Request, res: Response) => {
  const images = await ProductsService.setProductImages(
    req.user!.id,
    req.params.id,
    req.body.images
  );
  sendSuccess({ res, message: 'Product images updated', data: images });
});
