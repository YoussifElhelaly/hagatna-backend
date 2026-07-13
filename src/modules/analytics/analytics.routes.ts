import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { ROLES } from '@shared/constants/roles';
import * as AnalyticsController from './analytics.controller';
import * as SearchController from '@modules/search/search.controller';

const router = Router();

// All analytics endpoints are admin-only
router.use(authenticate, authorize(ROLES.ADMIN));

// GET /api/v1/admin/analytics/overview
router.get('/overview', AnalyticsController.getOverview);

// GET /api/v1/admin/analytics/revenue?from=2024-01-01&to=2024-12-31
router.get('/revenue', AnalyticsController.getRevenue);

// GET /api/v1/admin/analytics/top-products?limit=10
router.get('/top-products', AnalyticsController.getTopProducts);

// GET /api/v1/admin/analytics/top-vendors?limit=10
router.get('/top-vendors', AnalyticsController.getTopVendors);

// GET /api/v1/admin/analytics/top-searches?limit=20&from=&to=
router.get('/top-searches', SearchController.getTopSearches);

// GET /api/v1/admin/analytics/users-growth?from=2024-01-01&to=2024-12-31
router.get('/users-growth', AnalyticsController.getUsersGrowth);

// GET /api/v1/admin/analytics/active-carts?page=1&limit=20
router.get('/active-carts', AnalyticsController.getUsersWithActiveCarts);

export default router;
