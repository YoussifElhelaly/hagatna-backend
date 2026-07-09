import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as SiteSettingsService from './site-settings.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /settings/public  (public) ──────────────────────────────────────────
export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const data = await SiteSettingsService.getPublicSettings();
  sendSuccess({ res, message: 'Public settings retrieved', data });
});

// ─── PUT /settings  (admin) ──────────────────────────────────────────────────
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await SiteSettingsService.updateSettings(req.body);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    category: 'settings',
    action: 'update_site_settings',
    entityType: 'settings',
    entityId: 'site',
    metadata: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Site settings updated', data });
});
