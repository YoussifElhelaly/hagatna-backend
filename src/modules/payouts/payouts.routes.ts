import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { uploadImage } from '@shared/middlewares/upload';
import { ROLES } from '@shared/constants/roles';
import {
  ListPayoutsQuerySchema,
  PayoutIdParamSchema,
  CommissionsSummaryQuerySchema,
} from './payouts.validation';
import * as PayoutsController from './payouts.controller';

const router = Router();

// All payout endpoints are admin-only
router.use(authenticate, authorize(ROLES.ADMIN));

// GET  /api/v1/admin/payouts?status=pending&vendorId=xxx&page=1&limit=20
router.get(
  '/payouts',
  validate({ query: ListPayoutsQuerySchema }),
  PayoutsController.listPayouts,
);

// PATCH /api/v1/admin/payouts/:id/approve
// Body: multipart/form-data — optional field "image" (payment receipt/screenshot)
router.patch(
  '/payouts/:id/approve',
  uploadImage,                           // parses optional image field
  validate({ params: PayoutIdParamSchema }),
  PayoutsController.approvePayout,
);

// GET  /api/v1/admin/commissions/summary?vendorId=xxx
router.get(
  '/commissions/summary',
  validate({ query: CommissionsSummaryQuerySchema }),
  PayoutsController.getCommissionsSummary,
);

export default router;
