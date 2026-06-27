import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as ActivityLogsService from './activity-logs.service';
import type { ActivityRole, ActivityCategory } from '@prisma/client';

// ─── GET /api/v1/admin/activity-logs ─────────────────────────────────────────
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, userId, role, category, entityType, action, from, to, search } = req.query as Record<string, string>;
  const data = await ActivityLogsService.getLogs({
    page:       page  ? Number(page)  : 1,
    limit:      limit ? Number(limit) : 30,
    userId,
    role:       role as ActivityRole | undefined,
    category:   category as ActivityCategory | undefined,
    entityType,
    action,
    from,
    to,
    search,
  });
  sendSuccess({ res, message: 'Activity logs retrieved', data });
});

// ─── GET /api/v1/activity-logs  (vendor/customer own logs) ───────────────────
export const getMyLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, action, category, from, to } = req.query as Record<string, string>;
  const data = await ActivityLogsService.getMyLogs(req.user!.id, {
    page:     page  ? Number(page)  : 1,
    limit:    limit ? Number(limit) : 30,
    action,
    category: category as ActivityCategory | undefined,
    from,
    to,
  });
  sendSuccess({ res, message: 'Activity logs retrieved', data });
});

// ─── GET /api/v1/admin/activity-logs/stats ───────────────────────────────────
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const hours = req.query.hours ? Number(req.query.hours) : 24;
  const data = await ActivityLogsService.getStats(hours);
  sendSuccess({ res, message: 'Activity stats retrieved', data });
});

// ─── GET /api/v1/admin/activity-logs/stream  (SSE) ──────────────────────────
export const streamLogs = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const unsubscribe = ActivityLogsService.subscribeToActivity((data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// ─── GET /api/v1/admin/activity-logs/actions ─────────────────────────────────
export const getDistinctActions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await ActivityLogsService.getDistinctActions();
  sendSuccess({ res, message: 'Distinct actions retrieved', data });
});
