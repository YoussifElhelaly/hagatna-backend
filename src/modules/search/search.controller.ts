import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as SearchService from './search.service';

// ─── POST /search/track  (public) ─────────────────────────────────────────────
export const trackSearch = asyncHandler(async (req: Request, res: Response) => {
  await SearchService.logSearch(req.body.term);
  // Fire-and-forget from the client's perspective — no payload needed back.
  sendSuccess({ res, statusCode: 202, message: 'Search recorded' });
});

// ─── GET /admin/analytics/top-searches?limit=&from=&to=  (admin) ──────────────
export const getTopSearches = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await SearchService.getTopSearches(limit, from, to);
  sendSuccess({ res, message: 'Top searches retrieved', data });
});
