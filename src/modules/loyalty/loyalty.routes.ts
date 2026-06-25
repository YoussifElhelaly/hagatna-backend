import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  UpdateLoyaltySettingsSchema,
  LoyaltyTransactionsQuerySchema,
  AdminLoyaltyUserQuerySchema,
} from './loyalty.validation';
import * as LoyaltyController from './loyalty.controller';
import { z } from 'zod';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// GET  /api/v1/loyalty/settings
router.get('/settings', LoyaltyController.getSettings);

// GET  /api/v1/loyalty/preview?subtotal=100
router.get('/preview', LoyaltyController.previewEarn);

// ─── Customer ─────────────────────────────────────────────────────────────────

// GET  /api/v1/loyalty/me?page=1&limit=20&type=earned
router.get(
  '/me',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.VENDOR),
  validate({ query: LoyaltyTransactionsQuerySchema }),
  LoyaltyController.getMyAccount
);

// GET  /api/v1/loyalty/me/expiring?withinDays=30
router.get(
  '/me/expiring',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.VENDOR),
  LoyaltyController.getMyExpiringPoints
);

// GET  /api/v1/loyalty/preview/redeem?subtotal=100
router.get(
  '/preview/redeem',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.VENDOR),
  LoyaltyController.previewRedeem
);

// ─── Admin ────────────────────────────────────────────────────────────────────

// PATCH /api/v1/loyalty/settings
router.patch(
  '/settings',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: UpdateLoyaltySettingsSchema }),
  LoyaltyController.updateSettings
);

// GET  /api/v1/loyalty/admin/users/:userId
router.get(
  '/admin/users/:userId',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({
    params: z.object({ userId: z.string().uuid() }),
    query: LoyaltyTransactionsQuerySchema,
  }),
  LoyaltyController.getAccountByUserId
);

// POST /api/v1/loyalty/admin/users/:userId/adjust
router.post(
  '/admin/users/:userId/adjust',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({
    params: z.object({ userId: z.string().uuid() }),
    body: z.object({
      points:      z.number().int().refine((n) => n !== 0, { message: 'Points cannot be zero' }),
      description: z.string().min(3).max(255),
    }),
  }),
  LoyaltyController.adminAdjust
);

// POST /api/v1/loyalty/expire-points  (admin manual trigger / cron)
router.post(
  '/expire-points',
  authenticate,
  authorize(ROLES.ADMIN),
  LoyaltyController.triggerExpirePoints
);

// POST /api/v1/loyalty/settings/redeemable-categories
// Body: { categoryId: string }
router.post(
  '/settings/redeemable-categories',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: z.object({ categoryId: z.string().uuid() }) }),
  LoyaltyController.addRedeemableCategory
);

// DELETE /api/v1/loyalty/settings/redeemable-categories/:categoryId
router.delete(
  '/settings/redeemable-categories/:categoryId',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: z.object({ categoryId: z.string().uuid() }) }),
  LoyaltyController.removeRedeemableCategory
);

export default router;
