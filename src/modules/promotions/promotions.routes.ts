import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreatePromotionSchema,
  UpdatePromotionSchema,
  PromotionIdParamSchema,
  PromotionsListQuerySchema,
  ValidateCouponQuerySchema,
} from './promotions.validation';
import * as PromotionsController from './promotions.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Static paths (/validate, /vendor) MUST come before /:id
// ─────────────────────────────────────────────────────────────────────────────

// ─── Authenticated — coupon validation (cart page preview) ───────────────────

// GET /api/v1/promotions/validate?code=WELCOME15&subtotal=200
router.get(
  '/validate',
  authenticate,
  validate({ query: ValidateCouponQuerySchema }),
  PromotionsController.validateCoupon
);

// ─── Vendor — own promotions ──────────────────────────────────────────────────

// GET    /api/v1/promotions/vendor
router.get(
  '/vendor',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ query: PromotionsListQuerySchema }),
  PromotionsController.listVendorPromotions
);

// POST   /api/v1/promotions/vendor
router.post(
  '/vendor',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ body: CreatePromotionSchema }),
  PromotionsController.createVendorPromotion
);

// GET    /api/v1/promotions/vendor/:id
router.get(
  '/vendor/:id',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: PromotionIdParamSchema }),
  PromotionsController.getVendorPromotion
);

// PATCH  /api/v1/promotions/vendor/:id
router.patch(
  '/vendor/:id',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: PromotionIdParamSchema, body: UpdatePromotionSchema }),
  PromotionsController.updateVendorPromotion
);

// DELETE /api/v1/promotions/vendor/:id
router.delete(
  '/vendor/:id',
  authenticate,
  authorize(ROLES.VENDOR),
  validate({ params: PromotionIdParamSchema }),
  PromotionsController.deleteVendorPromotion
);

// ─── Admin — all promotions ───────────────────────────────────────────────────

// GET    /api/v1/promotions
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: PromotionsListQuerySchema }),
  PromotionsController.listPromotions
);

// POST   /api/v1/promotions
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: CreatePromotionSchema }),
  PromotionsController.createPromotion
);

// GET    /api/v1/promotions/:id
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: PromotionIdParamSchema }),
  PromotionsController.getPromotion
);

// PATCH  /api/v1/promotions/:id
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: PromotionIdParamSchema, body: UpdatePromotionSchema }),
  PromotionsController.updatePromotion
);

// DELETE /api/v1/promotions/:id
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: PromotionIdParamSchema }),
  PromotionsController.deletePromotion
);

export default router;
