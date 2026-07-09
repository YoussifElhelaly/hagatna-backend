import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreatePromoBannerSchema,
  UpdatePromoBannerSchema,
  PromoBannerIdParamSchema,
} from './promo-banners.validation';
import * as PromoBannersController from './promo-banners.controller';

const router = Router();

// ─── Public: active promo banners (home page) ─────────────────────────
// GET /api/v1/promo-banners
router.get('/', PromoBannersController.getActivePromoBanners);

// ─── Admin only ───────────────────────────────────────────────────────
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/all', PromoBannersController.getAllPromoBanners);

router.get(
  '/:id',
  validate({ params: PromoBannerIdParamSchema }),
  PromoBannersController.getPromoBannerById
);

router.post(
  '/',
  validate({ body: CreatePromoBannerSchema }),
  PromoBannersController.createPromoBanner
);

router.put(
  '/:id',
  validate({ params: PromoBannerIdParamSchema, body: UpdatePromoBannerSchema }),
  PromoBannersController.updatePromoBanner
);

router.delete(
  '/:id',
  validate({ params: PromoBannerIdParamSchema }),
  PromoBannersController.deletePromoBanner
);

export default router;
