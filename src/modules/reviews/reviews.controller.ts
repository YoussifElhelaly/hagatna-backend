import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as ReviewsService from './reviews.service';

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
  sendCreated(res, 'Review submitted and pending moderation', review);
});

// ─── PATCH /reviews/:id  (customer) ──────────────────────────────────────────
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.updateReview(req.user!.id, req.params.id, req.body);
  sendSuccess({ res, message: 'Review updated and re-submitted for moderation', data: review });
});

// ─── DELETE /reviews/:id  (customer or admin) ─────────────────────────────────
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  await ReviewsService.deleteReview(req.user!.id, req.params.id, isAdmin);
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
  sendSuccess({ res, message: 'Review approved', data: review });
});

// ─── PATCH /reviews/:id/reject  (admin) ──────────────────────────────────────
export const rejectReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewsService.rejectReview(req.params.id);
  sendSuccess({ res, message: 'Review rejected', data: review });
});

// ─── GET /reviews/vendor/me  (vendor) ────────────────────────────────────────
export const getVendorReviews = asyncHandler(async (req: Request, res: Response) => {
  const { reviews, meta } = await ReviewsService.getVendorReviews(
    req.user!.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Reviews retrieved', data: reviews, meta });
});
