import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as HomeSectionsService from './home-sections.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /home-sections  (public) ─────────────────────────────────────────────
export const getHomeSections = asyncHandler(async (_req: Request, res: Response) => {
  const data = await HomeSectionsService.getHomeSections();
  sendSuccess({ res, message: 'Home sections retrieved', data });
});

// ─── PUT /home-sections  (admin) ──────────────────────────────────────────────
export const updateHomeSections = asyncHandler(async (req: Request, res: Response) => {
  const data = await HomeSectionsService.updateHomeSections(req.body.sections);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    category: 'settings',
    action: 'update_home_sections',
    entityType: 'home_sections',
    entityId: 'home',
    metadata: { keys: req.body.sections.map((s: { key: string }) => s.key) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Home sections updated', data });
});
