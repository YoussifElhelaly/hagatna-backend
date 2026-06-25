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
  logActivity({ adminId: req.user!.id, action: 'update_platform_settings', entityType: 'settings', entityId: 'platform', metadata: req.body, ipAddress: req.ip });
  sendSuccess({ res, message: 'Platform settings updated', data: settings });
});
