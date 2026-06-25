import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  OnboardVendorSchema,
  UpdateVendorProfileSchema,
  RejectVendorSchema,
  UpdateCommissionSchema,
  VendorIdParamSchema,
  VendorSlugParamSchema,
  VendorsListQuerySchema,
} from './vendors.validation';
import * as VendorsController from './vendors.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: static paths (/me, /me/stats, /onboard) MUST come before /:slug
// otherwise GET /vendors/me is caught by /:slug (slug='me') and never reaches
// the vendor-profile handler.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Authenticated — static paths first ──────────────────────────────────────
// NOTE: no authorize() here because pending vendors (still customer role) need
// to view their profile & application status until admin approves them.

// GET   /api/v1/vendors/me
router.get(
  '/me',
  authenticate,
  VendorsController.getMyProfile
);

// PATCH /api/v1/vendors/me
router.patch(
  '/me',
  authenticate,
  validate({ body: UpdateVendorProfileSchema }),
  VendorsController.updateMyProfile
);

// GET   /api/v1/vendors/me/stats
router.get(
  '/me/stats',
  authenticate,
  VendorsController.getMyStats
);

// GET   /api/v1/vendors/me/earnings
router.get(
  '/me/earnings',
  authenticate,
  authorize(ROLES.VENDOR),
  VendorsController.getMyEarnings
);

// GET   /api/v1/vendors/me/payouts?status=pending&page=1&limit=20
router.get(
  '/me/payouts',
  authenticate,
  authorize(ROLES.VENDOR),
  VendorsController.getMyPayoutHistory
);

// GET   /api/v1/vendors/me/analytics/overview
router.get(
  '/me/analytics/overview',
  authenticate,
  authorize(ROLES.VENDOR),
  VendorsController.getMyAnalyticsOverview
);

// GET   /api/v1/vendors/me/analytics/revenue?from=2024-01-01&to=2024-12-31
router.get(
  '/me/analytics/revenue',
  authenticate,
  authorize(ROLES.VENDOR),
  VendorsController.getMyAnalyticsRevenue
);

// GET   /api/v1/vendors/me/analytics/top-products?limit=10
router.get(
  '/me/analytics/top-products',
  authenticate,
  authorize(ROLES.VENDOR),
  VendorsController.getMyTopProducts
);

// ─── Authenticated ────────────────────────────────────────────────────────────

// POST /api/v1/vendors/onboard  (any verified user)
router.post(
  '/onboard',
  authenticate,
  validate({ body: OnboardVendorSchema }),
  VendorsController.onboard
);

// ─── Admin Only ───────────────────────────────────────────────────────────────

// GET   /api/v1/vendors
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: VendorsListQuerySchema }),
  VendorsController.listVendors
);

// PATCH /api/v1/vendors/:id/approve
router.patch(
  '/:id/approve',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema }),
  VendorsController.approveVendor
);

// PATCH /api/v1/vendors/:id/reject
router.patch(
  '/:id/reject',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema, body: RejectVendorSchema }),
  VendorsController.rejectVendor
);

// PATCH /api/v1/vendors/:id/suspend
router.patch(
  '/:id/suspend',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema }),
  VendorsController.suspendVendor
);

// PATCH /api/v1/vendors/:id/commission
router.patch(
  '/:id/commission',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema, body: UpdateCommissionSchema }),
  VendorsController.updateCommission
);

// GET   /api/v1/vendors/:id/stats  (admin)
router.get(
  '/:id/stats',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema }),
  VendorsController.getVendorStats
);

// GET   /api/v1/vendors/:id/products  (admin)
router.get(
  '/:id/products',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema }),
  VendorsController.getVendorProducts
);

// GET   /api/v1/vendors/:id/orders  (admin)
router.get(
  '/:id/orders',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema }),
  VendorsController.getVendorOrders
);

// ─── Public — dynamic param LAST to avoid shadowing static paths ──────────────

// GET  /api/v1/vendors/store/:slug  (public store page)
router.get(
  '/store/:slug',
  validate({ params: VendorSlugParamSchema }),
  VendorsController.getPublicProfile
);

// GET  /api/v1/vendors/:id  (admin — fetch any vendor by UUID)
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: VendorIdParamSchema }),
  VendorsController.getVendorById
);

export default router;
