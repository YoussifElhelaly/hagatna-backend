import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { ROLES } from '@shared/constants/roles';
import * as SettingsController from './settings.controller';

const router = Router();

// All settings routes are admin-only
router.use(authenticate, authorize(ROLES.ADMIN));

// GET  /api/v1/admin/settings
router.get('/', SettingsController.getSettings);

// PATCH /api/v1/admin/settings
router.patch('/', SettingsController.updateSettings);

export default router;
