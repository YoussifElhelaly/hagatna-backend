import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  NotificationsListQuerySchema,
  NotificationIdParamSchema,
  BroadcastNotificationSchema,
} from './notifications.validation';
import * as NotificationsController from './notifications.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// Static paths (/unread-count, /read-all, /broadcast) BEFORE /:id
// ─────────────────────────────────────────────────────────────────────────────

// GET    /api/v1/notifications/unread-count
// Lightweight — for header badge polling
router.get('/unread-count', NotificationsController.getUnreadCount);

// PATCH  /api/v1/notifications/read-all
router.patch('/read-all', NotificationsController.markAllAsRead);

// POST   /api/v1/notifications/broadcast  (admin)
router.post(
  '/broadcast',
  authorize(ROLES.ADMIN),
  validate({ body: BroadcastNotificationSchema }),
  NotificationsController.broadcast
);

// ─── User list & bulk actions ────────────────────────────────────────────────

// GET    /api/v1/notifications
router.get(
  '/',
  validate({ query: NotificationsListQuerySchema }),
  NotificationsController.getNotifications
);

// DELETE /api/v1/notifications  (clear all)
router.delete('/', NotificationsController.deleteAllNotifications);

// ─── Single notification actions ─────────────────────────────────────────────

// PATCH  /api/v1/notifications/:id/read
router.patch(
  '/:id/read',
  validate({ params: NotificationIdParamSchema }),
  NotificationsController.markAsRead
);

// DELETE /api/v1/notifications/:id
router.delete(
  '/:id',
  validate({ params: NotificationIdParamSchema }),
  NotificationsController.deleteNotification
);

export default router;
