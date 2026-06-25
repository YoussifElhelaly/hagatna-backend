import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreateVendorPlanSchema,
  UpdateVendorPlanSchema,
  VendorPlanIdParamSchema,
  VendorPlansListQuerySchema,
} from './vendor-plans.validation';
import * as PlansController from './vendor-plans.controller';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
// Used by registration page to populate the plan selection dropdown

// GET  /api/v1/vendor-plans          — active plans (public)
router.get(
  '/',
  validate({ query: VendorPlansListQuerySchema }),
  PlansController.listPlans,
);

// GET  /api/v1/vendor-plans/:id      — single plan details (public)
router.get(
  '/:id',
  validate({ params: VendorPlanIdParamSchema }),
  PlansController.getPlan,
);

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET  /api/v1/vendor-plans/admin/all       — all plans incl. inactive
router.get(
  '/admin/all',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: VendorPlansListQuerySchema }),
  PlansController.listPlansAdmin,
);

// GET  /api/v1/vendor-plans/:id/vendors     — vendors on a plan
router.get(
  '/:id/vendors',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorPlanIdParamSchema }),
  PlansController.getVendorsOnPlan,
);

// POST /api/v1/vendor-plans
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: CreateVendorPlanSchema }),
  PlansController.createPlan,
);

// PATCH /api/v1/vendor-plans/:id
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorPlanIdParamSchema, body: UpdateVendorPlanSchema }),
  PlansController.updatePlan,
);

// DELETE /api/v1/vendor-plans/:id
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorPlanIdParamSchema }),
  PlansController.deletePlan,
);

export default router;
