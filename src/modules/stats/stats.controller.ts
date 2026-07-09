import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as StatsService from './stats.service';

// ─── GET /stats  (public) ─────────────────────────────────────────────────────
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await StatsService.getStorefrontStats();
  sendSuccess({ res, message: 'Storefront stats retrieved', data });
});
