import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as LoyaltyService from './loyalty.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /loyalty/settings  (public) ─────────────────────────────────────────
export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const data = await LoyaltyService.getSettings();
  sendSuccess({ res, message: 'Loyalty settings retrieved', data });
});

// ─── PATCH /loyalty/settings  (admin) ────────────────────────────────────────
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await LoyaltyService.updateSettings(req.body);
  logActivity({ adminId: req.user!.id, action: 'update_loyalty_settings', entityType: 'settings', entityId: 'loyalty', metadata: req.body, ipAddress: req.ip });
  sendSuccess({ res, message: 'Loyalty settings updated', data });
});

// ─── GET /loyalty/me  (customer) ─────────────────────────────────────────────
export const getMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const data = await LoyaltyService.getMyAccount(req.user!.id, req.query as never);
  sendSuccess({ res, message: 'Loyalty account retrieved', data });
});

// ─── GET /loyalty/preview?subtotal=100  (customer) ───────────────────────────
export const previewEarn = asyncHandler(async (req: Request, res: Response) => {
  const subtotal = Number(req.query.subtotal ?? 0);
  const data = await LoyaltyService.previewEarn(subtotal);
  sendSuccess({ res, message: 'Points preview', data });
});

// ─── GET /loyalty/preview/redeem?subtotal=100  (customer) ────────────────────
export const previewRedeem = asyncHandler(async (req: Request, res: Response) => {
  const subtotal = Number(req.query.subtotal ?? 0);
  const data = await LoyaltyService.previewRedeem(req.user!.id, subtotal);
  sendSuccess({ res, message: 'Redemption preview', data });
});

// ─── GET /loyalty/admin/users/:userId  (admin) ───────────────────────────────
export const getAccountByUserId = asyncHandler(async (req: Request, res: Response) => {
  const data = await LoyaltyService.getAccountByUserId(req.params.userId, req.query as never);
  sendSuccess({ res, message: 'User loyalty account retrieved', data });
});

// ─── POST /loyalty/admin/users/:userId/adjust  (admin) ───────────────────────
export const adminAdjust = asyncHandler(async (req: Request, res: Response) => {
  const { points, description } = req.body;
  const data = await LoyaltyService.adminAdjust(req.params.userId, points, description);
  logActivity({ adminId: req.user!.id, action: points > 0 ? 'add_loyalty_points' : 'deduct_loyalty_points', entityType: 'user', entityId: req.params.userId, metadata: { points, description }, ipAddress: req.ip });
  sendSuccess({ res, message: 'Points adjusted', data });
});

// ─── POST /loyalty/expire-points  (admin) ────────────────────────────────────
export const triggerExpirePoints = asyncHandler(async (req: Request, res: Response) => {
  const result = await LoyaltyService.expirePoints();
  logActivity({ adminId: req.user!.id, action: 'expire_loyalty_points', entityType: 'settings', entityId: 'loyalty', metadata: result, ipAddress: req.ip });
  sendSuccess({ res, message: 'Points expiry completed', data: result });
});

// ─── GET /loyalty/me/expiring  (customer/vendor) ─────────────────────────────
export const getMyExpiringPoints = asyncHandler(async (req: Request, res: Response) => {
  const withinDays = Number(req.query.withinDays ?? 30);
  const data = await LoyaltyService.getExpiringPoints(req.user!.id, withinDays);
  sendSuccess({ res, message: 'Expiring points', data });
});

// ─── POST /loyalty/settings/redeemable-categories  (admin) ───────────────────
export const addRedeemableCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await LoyaltyService.addRedeemableCategory(req.body.categoryId);
  sendSuccess({ res, message: 'Category added to redeemable list', data });
});

// ─── DELETE /loyalty/settings/redeemable-categories/:categoryId  (admin) ─────
export const removeRedeemableCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await LoyaltyService.removeRedeemableCategory(req.params.categoryId);
  sendSuccess({ res, message: 'Category removed from redeemable list', data });
});
