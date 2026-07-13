import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as ReviewsService from './reviews.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /reviews/product/:productSlug  (public) ─────────────────────────────
export const getProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReviewsService.getProductReviews(
    req.params.productSlug,
    req.query as never
  );
  sendSuccess({ res, message: 'Reviews retrieved', data: result.reviews, meta: result.meta, extra: { stats: result.stats } });
});

// ─── POST /reviews  (customer) ────────────────────────────────────────────────
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.createReview(req.user!.id, req.body);
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'create_review',
    category: 'review',
    entityType: 'review',
    entityId: (review as any).id,
    metadata: { productId: req.body.productId, rating: req.body.rating },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendCreated(res, 'Review submitted and pending moderation', review);
});

// ─── PATCH /reviews/:id  (customer) ──────────────────────────────────────────
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.updateReview(req.user!.id, req.params.id, req.body);
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'update_review',
    category: 'review',
    entityType: 'review',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Review updated and re-submitted for moderation', data: review });
});

// ─── DELETE /reviews/:id  (customer or admin) ─────────────────────────────────
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  await ReviewsService.deleteReview(req.user!.id, req.params.id, isAdmin);
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'delete_review',
    category: 'review',
    entityType: 'review',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Review deleted', data: null });
});

// ─── POST /reviews/:id/helpful  (authenticated) ───────────────────────────────
export const markHelpful = asyncHandler(async (req: Request, res: Response) => {
  const result = await ReviewsService.markHelpful(req.params.id);
  sendSuccess({ res, message: 'Marked as helpful', data: result });
});

// ─── GET /reviews  (admin) ────────────────────────────────────────────────────
export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const { reviews, meta } = await ReviewsService.listReviews(req.query as never);
  sendSuccess({ res, message: 'Reviews retrieved', data: reviews, meta });
});

// ─── PATCH /reviews/:id/approve  (admin) ─────────────────────────────────────
export const approveReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.approveReview(req.params.id);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    action: 'approve_review',
    category: 'review',
    entityType: 'review',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Review approved', data: review });
});

// ─── PATCH /reviews/:id/reject  (admin) ──────────────────────────────────────
export const rejectReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.rejectReview(req.params.id);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    action: 'reject_review',
    category: 'review',
    entityType: 'review',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Review rejected', data: review });
});

// ─── POST /reviews/admin  (admin authors a testimonial) ──────────────────────
export const adminCreateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.adminCreateReview(req.body);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    action: 'create_review',
    category: 'review',
    entityType: 'review',
    entityId: (review as any).id,
    metadata: { productId: req.body.productId, rating: req.body.rating, authored: true },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendCreated(res, 'Review created', review);
});

// ─── GET /reviews/vendor/me  (vendor) ────────────────────────────────────────
export const getVendorReviews = asyncHandler(async (req: Request, res: Response) => {
  const { reviews, meta } = await ReviewsService.getVendorReviews(
    req.user!.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Reviews retrieved', data: reviews, meta });
});
