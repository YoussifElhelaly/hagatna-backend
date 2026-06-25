import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { ROLES } from '@shared/constants/roles';
import * as ActivityLogsController from './activity-logs.controller';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

// GET /api/v1/admin/activity-logs?page=1&limit=30&adminId=&entityType=&action=&from=&to=
router.get('/', ActivityLogsController.getLogs);

// GET /api/v1/admin/activity-logs/actions
router.get('/actions', ActivityLogsController.getDistinctActions);

export default router;
