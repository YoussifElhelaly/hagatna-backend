import { Router } from 'express';
import * as bannerController from './banners.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { validate } from '../../shared/middlewares/validate';
import {
  CreateBannerSchema,
  UpdateBannerSchema,
  UpdateBannerBodySchema,
  ReorderBannerSchema,
} from './banners.validation';

const router = Router();

// ─── Public: Get active banners (for homepage) ────────────────
router.get('/', bannerController.getActiveBanners);

// ─── Admin only ───────────────────────────────────────────────
router.use(authenticate);
router.use(authorize('admin'));

router.get('/all', bannerController.getAllBanners);

router.get('/:id', bannerController.getBannerById);

router.post(
  '/',
  validate({ body: CreateBannerSchema }),
  bannerController.createBanner
);

router.put(
  '/:id',
  validate({ params: UpdateBannerSchema, body: UpdateBannerBodySchema }),
  bannerController.updateBanner
);

router.delete('/:id', bannerController.deleteBanner);

router.patch(
  '/:id/toggle',
  validate({ params: UpdateBannerSchema }),
  bannerController.toggleBanner
);

router.patch(
  '/reorder',
  validate({ body: ReorderBannerSchema }),
  bannerController.reorderBanners
);

export default router;
