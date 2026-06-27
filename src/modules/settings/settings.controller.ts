import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as SettingsService from './settings.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /admin/settings  (admin) ─────────────────────────────────────────────
export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await SettingsService.getSettings();
  sendSuccess({ res, message: 'Platform settings retrieved', data: settings });
});

// ─── PATCH /admin/settings  (admin) ───────────────────────────────────────────
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await SettingsService.updateSettings(req.body);
  logActivity({ userId: req.user!.id, role: 'admin', category: 'settings', action: 'update_platform_settings', entityType: 'settings', entityId: 'platform', metadata: req.body, ipAddress: req.ip, userAgent: req.get('user-agent') });
  sendSuccess({ res, message: 'Platform settings updated', data: settings });
});
