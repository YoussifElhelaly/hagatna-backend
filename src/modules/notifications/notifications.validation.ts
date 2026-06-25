import { z } from 'zod';
import { NotificationType } from '@prisma/client';

const localizedStringSchema = z.object({
  en: z.string().min(1, 'English value is required'),
  ar: z.string().min(1, 'Arabic value is required'),
});

// ─── List query ───────────────────────────────────────────────────────────────
export const NotificationsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  isRead: z.coerce.boolean().optional(),
  type: z.nativeEnum(NotificationType).optional(),
});

// ─── Params ───────────────────────────────────────────────────────────────────
export const NotificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

// ─── Admin broadcast ──────────────────────────────────────────────────────────
export const BroadcastNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: localizedStringSchema,
  body: localizedStringSchema,
  data: z.record(z.unknown()).optional(),
  userIds: z
    .array(z.string().uuid())
    .min(1, 'Provide at least one user ID, or omit to broadcast to all active users')
    .optional(),
});
