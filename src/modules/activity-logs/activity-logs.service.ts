import { prisma } from '@database/prisma/client';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type { ActivityRole, ActivityCategory } from '@prisma/client';
import { EventEmitter } from 'events';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LogActivityInput {
  userId?:     string | null;
  role?:       ActivityRole;
  category?:   ActivityCategory;
  action:      string;
  entityType?: string;
  entityId?:   string;
  entityLabel?: string;
  metadata?:   Record<string, unknown>;
  ipAddress?:  string;
  userAgent?:  string;
}

export interface ActivityLogsQuery {
  page?:       number;
  limit?:      number;
  userId?:     string;
  role?:       ActivityRole;
  category?:   ActivityCategory;
  entityType?: string;
  action?:     string;
  from?:       string;
  to?:         string;
  search?:     string;
}

// ─── SSE Event Bus ────────────────────────────────────────────────────────────
class ActivityEventBus extends EventEmitter {
  private static instance: ActivityEventBus;

  static getInstance(): ActivityEventBus {
    if (!ActivityEventBus.instance) {
      ActivityEventBus.instance = new ActivityEventBus();
      ActivityEventBus.instance.setMaxListeners(100);
    }
    return ActivityEventBus.instance;
  }
}

const eventBus = ActivityEventBus.getInstance();

// ─────────────────────────────────────────────────────────────────────────────
// logActivity  —  fire-and-forget utility called by controllers
// Never throws — a logging failure should never crash the main action
// ─────────────────────────────────────────────────────────────────────────────
export const logActivity = async (input: LogActivityInput): Promise<void> => {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId:      input.userId ?? null,
        role:        input.role ?? 'system',
        category:    input.category ?? 'system',
        action:      input.action,
        entityType:  input.entityType ?? null,
        entityId:    input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        metadata:    input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        ipAddress:   input.ipAddress ?? null,
        userAgent:   input.userAgent ?? null,
      },
    });

    // Emit for SSE subscribers (non-blocking)
    eventBus.emit('activity', {
      id:          log.id,
      userId:      log.userId,
      role:        log.role,
      category:    log.category,
      action:      log.action,
      entityType:  log.entityType,
      entityId:    log.entityId,
      entityLabel: log.entityLabel,
      metadata:    log.metadata,
      ipAddress:   log.ipAddress,
      createdAt:   log.createdAt,
    });
  } catch {
    // silently ignore
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getLogs  —  paginated list with optional filters
// ─────────────────────────────────────────────────────────────────────────────
export const getLogs = async (query: ActivityLogsQuery) => {
  const { page = 1, limit = 30, userId, role, category, entityType, action, from, to, search } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (userId)     where.userId     = userId;
  if (role)       where.role       = role;
  if (category)   where.category   = category;
  if (entityType) where.entityType = entityType;
  if (action)     where.action     = { contains: action, mode: 'insensitive' };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }
  if (search) {
    where.OR = [
      { action:     { contains: search, mode: 'insensitive' } },
      { entityLabel: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        userId:      true,
        role:        true,
        category:    true,
        action:      true,
        entityType:  true,
        entityId:    true,
        entityLabel: true,
        metadata:    true,
        ipAddress:   true,
        userAgent:   true,
        createdAt:   true,
        user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getMyLogs  —  user's own activity logs
// ─────────────────────────────────────────────────────────────────────────────
export const getMyLogs = async (userId: string, query: ActivityLogsQuery) => {
  return getLogs({ ...query, userId });
};

// ─────────────────────────────────────────────────────────────────────────────
// getStats  —  aggregated statistics for dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getStats = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [
    totalRecent,
    byRole,
    byCategory,
    byAction,
    hourlyActivity,
  ] = await Promise.all([
    // Total logs in the time window
    prisma.activityLog.count({ where: { createdAt: { gte: since } } }),

    // Breakdown by role
    prisma.activityLog.groupBy({
      by: ['role'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),

    // Breakdown by category
    prisma.activityLog.groupBy({
      by: ['category'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),

    // Top 10 actions
    prisma.activityLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    // Hourly activity (last 24 hours)
    prisma.$queryRaw<{ hour: string; count: bigint }[]>`
      SELECT
        TO_CHAR(date_trunc('hour', "createdAt"), 'YYYY-MM-DD HH24:00') AS hour,
        COUNT(*)::bigint AS count
      FROM "activity_logs"
      WHERE "createdAt" >= ${since}
      GROUP BY date_trunc('hour', "createdAt")
      ORDER BY hour ASC
    `,
  ]);

  return {
    total: totalRecent,
    hours,
    byRole:     byRole.map(r => ({ role: r.role, count: Number(r._count.id) })),
    byCategory: byCategory.map(c => ({ category: c.category, count: Number(c._count.id) })),
    topActions:  byAction.map(a => ({ action: a.action, count: Number(a._count.id) })),
    hourly:      hourlyActivity.map(h => ({ hour: h.hour, count: Number(h.count) })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SSE Stream  —  real-time activity feed
// ─────────────────────────────────────────────────────────────────────────────
export const subscribeToActivity = (callback: (data: Record<string, unknown>) => void): (() => void) => {
  const handler = (data: Record<string, unknown>) => callback(data);
  eventBus.on('activity', handler);
  return () => eventBus.off('activity', handler);
};

// ─────────────────────────────────────────────────────────────────────────────
// getDistinctActions  —  unique action types for filter dropdown
// ─────────────────────────────────────────────────────────────────────────────
export const getDistinctActions = async (): Promise<string[]> => {
  const rows = await prisma.activityLog.findMany({
    select:  { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  });
  return rows.map((r) => r.action);
};
