import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreateReviewSchema,
  AdminCreateReviewSchema,
  UpdateReviewSchema,
  ReviewIdParamSchema,
  ProductSlugParamSchema,
  ProductReviewsQuerySchema,
  AdminReviewsQuerySchema,
} from './reviews.validation';
import * as ReviewsController from './reviews.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Static paths (/product, /admin) come before /:id
// ─────────────────────────────────────────────────────────────────────────────

// ─── Public ───────────────────────────────────────────────────────────────────

// GET /api/v1/reviews/recent
// Returns latest approved top reviews for the homepage
router.get('/recent', ReviewsController.getRecentReviews);

// GET /api/v1/reviews/product/:productSlug
// Returns approved reviews + rating stats (average, distribution by star)
router.get(
  '/product/:productSlug',
  validate({ params: ProductSlugParamSchema, query: ProductReviewsQuerySchema }),
  ReviewsController.getProductReviews
);

// ─── Vendor ───────────────────────────────────────────────────────────────────

// GET /api/v1/reviews/vendor/me?productId=&rating=&status=&page=&limit=
router.get(
  '/vendor/me',
  authenticate,
  authorize(ROLES.VENDOR),
  ReviewsController.getVendorReviews
);

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/v1/reviews
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: AdminReviewsQuerySchema }),
  ReviewsController.listReviews
);

// POST /api/v1/reviews/admin  (admin authors a review/testimonial)
router.post(
  '/admin',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: AdminCreateReviewSchema }),
  ReviewsController.adminCreateReview
);

// PATCH /api/v1/reviews/:id/approve
router.patch(
  '/:id/approve',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ReviewIdParamSchema }),
  ReviewsController.approveReview
);

// PATCH /api/v1/reviews/:id/reject
router.patch(
  '/:id/reject',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: ReviewIdParamSchema }),
  ReviewsController.rejectReview
);

// ─── Customer ─────────────────────────────────────────────────────────────────

// POST /api/v1/reviews
router.post(
  '/',
  authenticate,
  validate({ body: CreateReviewSchema }),
  ReviewsController.createReview
);

// PATCH /api/v1/reviews/:id
router.patch(
  '/:id',
  authenticate,
  validate({ params: ReviewIdParamSchema, body: UpdateReviewSchema }),
  ReviewsController.updateReview
);

// DELETE /api/v1/reviews/:id
router.delete(
  '/:id',
  authenticate,
  validate({ params: ReviewIdParamSchema }),
  ReviewsController.deleteReview
);

// POST /api/v1/reviews/:id/helpful  (any authenticated user)
router.post(
  '/:id/helpful',
  authenticate,
  validate({ params: ReviewIdParamSchema }),
  ReviewsController.markHelpful
);

export default router;
