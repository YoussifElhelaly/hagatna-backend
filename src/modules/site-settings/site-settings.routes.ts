import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import { UpdateSiteSettingsSchema } from './site-settings.validation';
import * as SiteSettingsController from './site-settings.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// GET /api/v1/settings/public
router.get('/public', SiteSettingsController.getPublicSettings);

// ─── Admin ───────────────────────────────────────────────────────────
// PUT /api/v1/settings
router.put(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: UpdateSiteSettingsSchema }),
  SiteSettingsController.updateSettings
);

export default router;
