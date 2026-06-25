import { prisma } from '@database/prisma/client';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LogActivityInput {
  adminId:     string;
  action:      string;
  entityType?: string;
  entityId?:   string;
  entityLabel?: string;
  metadata?:   Record<string, unknown>;
  ipAddress?:  string;
}

export interface ActivityLogsQuery {
  page?:       number;
  limit?:      number;
  adminId?:    string;
  entityType?: string;
  action?:     string;
  from?:       string;
  to?:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// logActivity  —  fire-and-forget utility called by controllers
// Never throws — a logging failure should never crash the main action
// ─────────────────────────────────────────────────────────────────────────────
export const logActivity = async (input: LogActivityInput): Promise<void> => {
  try {
    await prisma.adminActivityLog.create({ data: input as any });
  } catch {
    // silently ignore
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getLogs  —  paginated list with optional filters
// ─────────────────────────────────────────────────────────────────────────────
export const getLogs = async (query: ActivityLogsQuery) => {
  const { page = 1, limit = 30, adminId, entityType, action, from, to } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (adminId)    where.adminId    = adminId;
  if (entityType) where.entityType = entityType;
  if (action)     where.action     = { contains: action, mode: 'insensitive' };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        action:      true,
        entityType:  true,
        entityId:    true,
        entityLabel: true,
        metadata:    true,
        ipAddress:   true,
        createdAt:   true,
        admin: { select: { id: true, name: true, email: true, avatar: true } },
      },
    }),
    prisma.adminActivityLog.count({ where }),
  ]);

  return { logs, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getDistinctActions  —  unique action types for filter dropdown
// ─────────────────────────────────────────────────────────────────────────────
export const getDistinctActions = async (): Promise<string[]> => {
  const rows = await prisma.adminActivityLog.findMany({
    select:  { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  });
  return rows.map((r) => r.action);
};
