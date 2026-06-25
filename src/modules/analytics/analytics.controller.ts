import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as AnalyticsService from './analytics.service';

// ─── GET /admin/analytics/overview ───────────────────────────────────────────
export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const data = await AnalyticsService.getOverview();
  sendSuccess({ res, message: 'Overview analytics retrieved', data });
});

// ─── GET /admin/analytics/revenue?from=&to= ──────────────────────────────────
export const getRevenue = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const data = await AnalyticsService.getRevenue(from, to);
  sendSuccess({ res, message: 'Revenue analytics retrieved', data });
});

// ─── GET /admin/analytics/top-products ───────────────────────────────────────
export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const data = await AnalyticsService.getTopProducts(limit);
  sendSuccess({ res, message: 'Top products retrieved', data });
});

// ─── GET /admin/analytics/top-vendors ────────────────────────────────────────
export const getTopVendors = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const data = await AnalyticsService.getTopVendors(limit);
  sendSuccess({ res, message: 'Top vendors retrieved', data });
});

// ─── GET /admin/analytics/users-growth ───────────────────────────────────────
export const getUsersGrowth = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const data = await AnalyticsService.getUsersGrowth(from, to);
  sendSuccess({ res, message: 'Users growth data retrieved', data });
});

// ─── GET /admin/analytics/active-carts?page=&limit= ──────────────────────────
export const getUsersWithActiveCarts = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const { users, meta } = await AnalyticsService.getUsersWithActiveCarts(page, limit);
  sendSuccess({ res, message: 'Users with active carts retrieved', data: users, meta });
});
