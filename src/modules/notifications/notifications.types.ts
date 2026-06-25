import { NotificationType } from '@prisma/client';
import { LocalizedString } from '@shared/types';

// ─── Internal create (used by other services) ─────────────────────────────────
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: LocalizedString;
  body: LocalizedString;
  data?: Record<string, unknown>;   // e.g. { orderId, orderNumber, productId }
}

// ─── Admin broadcast ──────────────────────────────────────────────────────────
export interface BroadcastNotificationInput {
  type: NotificationType;
  title: LocalizedString;
  body: LocalizedString;
  data?: Record<string, unknown>;
  userIds?: string[];   // if omitted → send to all active users (use carefully)
}

// ─── List query ───────────────────────────────────────────────────────────────
export interface NotificationsListQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}
