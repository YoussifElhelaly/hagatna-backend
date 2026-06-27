import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { ROLES } from '@shared/constants/roles';
import * as ActivityLogsController from './activity-logs.controller';

const router = Router();

// ─── Admin routes (see all logs) ────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, authorize(ROLES.ADMIN));

// GET /api/v1/admin/activity-logs?page=1&limit=30&userId=&role=&category=&entityType=&action=&from=&to=&search=
adminRouter.get('/', ActivityLogsController.getLogs);

// GET /api/v1/admin/activity-logs/stats?hours=24
adminRouter.get('/stats', ActivityLogsController.getStats);

// GET /api/v1/admin/activity-logs/stream (SSE)
adminRouter.get('/stream', ActivityLogsController.streamLogs);

// GET /api/v1/admin/activity-logs/actions
adminRouter.get('/actions', ActivityLogsController.getDistinctActions);

// ─── Vendor/Customer routes (see own logs) ──────────────────────────────────
const myRouter = Router();
myRouter.use(authenticate, authorize(ROLES.VENDOR, ROLES.CUSTOMER));

// GET /api/v1/activity-logs?page=1&limit=30&action=&category=&from=&to=
myRouter.get('/', ActivityLogsController.getMyLogs);

router.use('/admin/activity-logs', adminRouter);
router.use('/activity-logs', myRouter);

export default router;
