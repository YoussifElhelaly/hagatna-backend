import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as ActivityLogsService from './activity-logs.service';

// ─── GET /api/v1/admin/activity-logs ─────────────────────────────────────────
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, adminId, entityType, action, from, to } = req.query as Record<string, string>;
  const data = await ActivityLogsService.getLogs({
    page:       page  ? Number(page)  : 1,
    limit:      limit ? Number(limit) : 30,
    adminId,
    entityType,
    action,
    from,
    to,
  });
  sendSuccess({ res, message: 'Activity logs retrieved', data });
});

// ─── GET /api/v1/admin/activity-logs/actions ─────────────────────────────────
export const getDistinctActions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await ActivityLogsService.getDistinctActions();
  sendSuccess({ res, message: 'Distinct actions retrieved', data });
});
