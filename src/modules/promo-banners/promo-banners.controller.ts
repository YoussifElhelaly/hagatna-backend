import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import * as PromoBannersService from './promo-banners.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

const titleLabel = (title: unknown) =>
  (typeof title === 'object' && title !== null ? (title as { en?: string }).en : String(title)) || '';

// ─── GET /promo-banners  (public) ─────────────────────────────────────────────
export const getActivePromoBanners = asyncHandler(async (_req: Request, res: Response) => {
  const data = await PromoBannersService.getActivePromoBanners();
  sendSuccess({ res, message: 'Promo banners retrieved', data });
});

// ─── GET /promo-banners/all  (admin) ──────────────────────────────────────────
export const getAllPromoBanners = asyncHandler(async (_req: Request, res: Response) => {
  const data = await PromoBannersService.getAllPromoBanners();
  sendSuccess({ res, message: 'Promo banners retrieved', data });
});

// ─── GET /promo-banners/:id  (admin) ──────────────────────────────────────────
export const getPromoBannerById = asyncHandler(async (req: Request, res: Response) => {
  const data = await PromoBannersService.getPromoBannerById(req.params.id);
  sendSuccess({ res, message: 'Promo banner retrieved', data });
});

// ─── POST /promo-banners  (admin) ─────────────────────────────────────────────
export const createPromoBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await PromoBannersService.createPromoBanner(req.body);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    category: 'settings',
    action: 'create_promo_banner',
    entityType: 'promo_banner',
    entityId: banner.id,
    entityLabel: titleLabel(banner.title),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendCreated(res, 'Promo banner created successfully', banner);
});

// ─── PUT /promo-banners/:id  (admin) ──────────────────────────────────────────
export const updatePromoBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await PromoBannersService.updatePromoBanner(req.params.id, req.body);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    category: 'settings',
    action: 'update_promo_banner',
    entityType: 'promo_banner',
    entityId: req.params.id,
    entityLabel: titleLabel(banner.title),
    metadata: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Promo banner updated successfully', data: banner });
});

// ─── DELETE /promo-banners/:id  (admin) ───────────────────────────────────────
export const deletePromoBanner = asyncHandler(async (req: Request, res: Response) => {
  await PromoBannersService.deletePromoBanner(req.params.id);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    category: 'settings',
    action: 'delete_promo_banner',
    entityType: 'promo_banner',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Promo banner deleted successfully', data: null });
});
