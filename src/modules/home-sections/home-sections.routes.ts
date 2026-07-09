import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import { UpdateHomeSectionsSchema } from './home-sections.validation';
import * as HomeSectionsController from './home-sections.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// GET /api/v1/home-sections
router.get('/', HomeSectionsController.getHomeSections);

// ─── Admin ───────────────────────────────────────────────────────────
// PUT /api/v1/home-sections
router.put(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: UpdateHomeSectionsSchema }),
  HomeSectionsController.updateHomeSections
);

export default router;
