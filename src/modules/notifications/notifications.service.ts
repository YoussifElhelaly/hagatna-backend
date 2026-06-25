import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import { getIO } from '@socket/index';
import type {
  CreateNotificationInput,
  BroadcastNotificationInput,
  NotificationsListQuery,
} from './notifications.types';

// ─── Shared select ────────────────────────────────────────────────────────────
const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  isRead: true,
  readAt: true,
  createdAt: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// createNotification  —  internal helper called by other services
// Non-throwing: a failed notification must never crash a business operation
// ─────────────────────────────────────────────────────────────────────────────
export const createNotification = async (
  input: CreateNotificationInput
): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? undefined) as never,
      },
      select: notificationSelect,
    });

    // ── Real-time push via Socket.IO ────────────────────────────────────────
    // getIO() throws if Socket.IO is not yet initialized (e.g., during tests),
    // so we guard and swallow — a missing socket must never crash anything.
    try {
      getIO().to(`user:${input.userId}`).emit('notification', notification);
    } catch {
      // Socket not initialized — skip push silently
    }
  } catch {
    // Swallow — notification failure must never break the calling operation
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getNotifications  —  paginated list for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export const getNotifications = async (
  userId: string,
  query: NotificationsListQuery
) => {
  const { page = 1, limit = 20, isRead, type } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    userId,
    deletedAt: null,
    ...(isRead !== undefined && { isRead }),
    ...(type && { type }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: notificationSelect,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false, deletedAt: null } }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: buildPaginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getUnreadCount  —  lightweight badge count
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false, deletedAt: null },
  });
  return { unreadCount: count };
};

// ─────────────────────────────────────────────────────────────────────────────
// markAsRead  —  single notification
// ─────────────────────────────────────────────────────────────────────────────
export const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, deletedAt: null },
  });
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.userId !== userId) throw ApiError.forbidden('Access denied');
  if (notification.isRead) return notification;  // already read — no-op

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
    select: notificationSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// markAllAsRead  —  bulk update all unread for the user
// ─────────────────────────────────────────────────────────────────────────────
export const markAllAsRead = async (userId: string) => {
  const now = new Date();
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false, deletedAt: null },
    data: { isRead: true, readAt: now },
  });
  return { markedRead: count };
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteNotification  —  single, owned by user
// ─────────────────────────────────────────────────────────────────────────────
export const deleteNotification = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, deletedAt: null },
  });
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.userId !== userId) throw ApiError.forbidden('Access denied');

  await prisma.notification.update({
    where: { id: notificationId },
    data: { deletedAt: new Date() },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteAllNotifications  —  clear all for the user
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAllNotifications = async (userId: string) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return { deleted: count };
};

// ─────────────────────────────────────────────────────────────────────────────
// broadcast  —  admin sends to specific users or all active users
// Uses batched createMany to avoid giant single queries
// ─────────────────────────────────────────────────────────────────────────────
export const broadcast = async (input: BroadcastNotificationInput) => {
  const { type, title, body, data, userIds } = input;

  let targetIds: string[];

  if (userIds && userIds.length > 0) {
    targetIds = userIds;
  } else {
    // Send to all active users — fetch IDs in chunks
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    targetIds = users.map((u) => u.id);
  }

  if (targetIds.length === 0) {
    return { sent: 0 };
  }

  // Batch createMany in chunks of 500 to avoid DB overload
  const CHUNK_SIZE = 500;
  const notificationData = targetIds.map((userId) => ({
    userId,
    type,
    title: title as never,
    body: body as never,
    data: (data ?? Prisma.JsonNull) as never,
  }));

  let sent = 0;
  for (let i = 0; i < notificationData.length; i += CHUNK_SIZE) {
    const chunk = notificationData.slice(i, i + CHUNK_SIZE);
    const result = await prisma.notification.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    sent += result.count;
  }

  return { sent };
};

// ─────────────────────────────────────────────────────────────────────────────
// Convenience factory — pre-built notification templates for other modules
// ─────────────────────────────────────────────────────────────────────────────
export const notify = {
  orderPlaced: (userId: string, orderNumber: string, orderId: string) =>
    createNotification({
      userId,
      type: NotificationType.order,
      title: { en: 'Order Placed', ar: 'تم تقديم الطلب' },
      body: {
        en: `Your order ${orderNumber} has been placed successfully.`,
        ar: `تم تقديم طلبك ${orderNumber} بنجاح.`,
      },
      data: { orderId, orderNumber },
    }),

  orderStatusChanged: (
    userId: string,
    orderNumber: string,
    orderId: string,
    status: string
  ) =>
    createNotification({
      userId,
      type: NotificationType.order,
      title: { en: 'Order Updated', ar: 'تحديث الطلب' },
      body: {
        en: `Your order ${orderNumber} status changed to: ${status}.`,
        ar: `تغيرت حالة طلبك ${orderNumber} إلى: ${status}.`,
      },
      data: { orderId, orderNumber, status },
    }),

  reviewApproved: (userId: string, productName: string, reviewId: string) =>
    createNotification({
      userId,
      type: NotificationType.review,
      title: { en: 'Review Approved', ar: 'تمت الموافقة على المراجعة' },
      body: {
        en: `Your review for "${productName}" has been approved.`,
        ar: `تمت الموافقة على مراجعتك لـ "${productName}".`,
      },
      data: { reviewId },
    }),

  newMessage: (userId: string, senderName: string, conversationId: string) =>
    createNotification({
      userId,
      type: NotificationType.message,
      title: { en: 'New Message', ar: 'رسالة جديدة' },
      body: {
        en: `You have a new message from ${senderName}.`,
        ar: `لديك رسالة جديدة من ${senderName}.`,
      },
      data: { conversationId },
    }),

  vendorApproved: (userId: string, storeName: string) =>
    createNotification({
      userId,
      type: NotificationType.system,
      title: { en: 'Store Approved', ar: 'تمت الموافقة على المتجر' },
      body: {
        en: `Congratulations! Your store "${storeName}" has been approved.`,
        ar: `تهانينا! تمت الموافقة على متجرك "${storeName}".`,
      },
      data: { storeName },
    }),

  productApproved: (userId: string, productName: string, productId: string) =>
    createNotification({
      userId,
      type: NotificationType.system,
      title: { en: 'Product Approved', ar: 'تمت الموافقة على المنتج' },
      body: {
        en: `Your product "${productName}" has been approved and is now live.`,
        ar: `تمت الموافقة على منتجك "${productName}" وهو متاح الآن.`,
      },
      data: { productId, productName },
    }),

  productRejected: (userId: string, productName: string, productId: string, reason: string) =>
    createNotification({
      userId,
      type: NotificationType.system,
      title: { en: 'Product Rejected', ar: 'تم رفض المنتج' },
      body: {
        en: `Your product "${productName}" was rejected. Reason: ${reason}`,
        ar: `تم رفض منتجك "${productName}". السبب: ${reason}`,
      },
      data: { productId, productName, reason },
    }),
};
