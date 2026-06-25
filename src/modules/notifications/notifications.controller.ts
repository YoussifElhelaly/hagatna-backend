import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as NotificationsService from './notifications.service';

// ─── GET /notifications  (authenticated) ─────────────────────────────────────
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationsService.getNotifications(
    req.user!.id,
    req.query as never
  );
  sendSuccess({
    res,
    message: 'Notifications retrieved',
    data: result.notifications,
    meta: result.meta,
    extra: { unreadCount: result.unreadCount },
  });
});

// ─── GET /notifications/unread-count  (authenticated) ────────────────────────
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationsService.getUnreadCount(req.user!.id);
  sendSuccess({ res, message: 'Unread count retrieved', data: result });
});

// ─── PATCH /notifications/read-all  (authenticated) ──────────────────────────
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationsService.markAllAsRead(req.user!.id);
  sendSuccess({ res, message: `${result.markedRead} notification(s) marked as read`, data: result });
});

// ─── PATCH /notifications/:id/read  (authenticated) ──────────────────────────
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await NotificationsService.markAsRead(req.user!.id, req.params.id);
  sendSuccess({ res, message: 'Notification marked as read', data: notification });
});

// ─── DELETE /notifications  (authenticated) ───────────────────────────────────
export const deleteAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationsService.deleteAllNotifications(req.user!.id);
  sendSuccess({ res, message: `${result.deleted} notification(s) deleted`, data: result });
});

// ─── DELETE /notifications/:id  (authenticated) ───────────────────────────────
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  await NotificationsService.deleteNotification(req.user!.id, req.params.id);
  sendSuccess({ res, message: 'Notification deleted', data: null });
});

// ─── POST /notifications/broadcast  (admin) ───────────────────────────────────
export const broadcast = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationsService.broadcast(req.body);
  sendSuccess({ res, message: `Notification sent to ${result.sent} user(s)`, data: result });
});
