import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import * as VendorsService from './vendors.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── POST /vendors/onboard ────────────────────────────────────────────────────
export const onboard = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.onboard(req.user!.id, req.body);
  sendCreated(res, 'Vendor application submitted. Awaiting admin approval.', vendor);
});

// ─── GET /vendors/me ──────────────────────────────────────────────────────────
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.getMyProfile(req.user!.id);
  sendSuccess({ res, message: 'Vendor profile retrieved', data: vendor });
});

// ─── PATCH /vendors/me ────────────────────────────────────────────────────────
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.updateMyProfile(req.user!.id, req.body);
  sendSuccess({ res, message: 'Store profile updated', data: vendor });
});

// ─── GET /vendors/me/stats ────────────────────────────────────────────────────
export const getMyStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await VendorsService.getMyStats(req.user!.id);
  sendSuccess({ res, message: 'Vendor stats retrieved', data: stats });
});

// ─── GET /vendors/:slug  (public) ─────────────────────────────────────────────
export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.getPublicProfile(req.params.slug);
  sendSuccess({ res, message: 'Store profile retrieved', data: vendor });
});

// ─── GET /vendors  (admin) ────────────────────────────────────────────────────
export const listVendors = asyncHandler(async (req: Request, res: Response) => {
  const { vendors, meta } = await VendorsService.listVendors(req.query as never);
  sendSuccess({ res, message: 'Vendors retrieved', data: vendors, meta });
});

// ─── GET /vendors/:id  (admin) ───────────────────────────────────────────────
export const getVendorById = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.getVendorById(req.params.id);
  sendSuccess({ res, message: 'Vendor retrieved', data: vendor });
});

// ─── PATCH /vendors/:id/approve  (admin) ──────────────────────────────────────
export const approveVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.approveVendor(req.params.id);
  logActivity({ adminId: req.user!.id, action: 'approve_vendor', entityType: 'vendor', entityId: req.params.id, entityLabel: (vendor as any).storeName?.en || String((vendor as any).storeName), ipAddress: req.ip });
  sendSuccess({ res, message: 'Vendor approved successfully', data: vendor });
});

// ─── PATCH /vendors/:id/reject  (admin) ───────────────────────────────────────
export const rejectVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.rejectVendor(req.params.id, req.body.rejectionReason);
  logActivity({ adminId: req.user!.id, action: 'reject_vendor', entityType: 'vendor', entityId: req.params.id, entityLabel: (vendor as any).storeName?.en || String((vendor as any).storeName), metadata: { reason: req.body.rejectionReason }, ipAddress: req.ip });
  sendSuccess({ res, message: 'Vendor application rejected', data: vendor });
});

// ─── PATCH /vendors/:id/suspend  (admin) ──────────────────────────────────────
export const suspendVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.suspendVendor(req.params.id);
  logActivity({ adminId: req.user!.id, action: 'suspend_vendor', entityType: 'vendor', entityId: req.params.id, entityLabel: (vendor as any).storeName?.en || String((vendor as any).storeName), ipAddress: req.ip });
  sendSuccess({ res, message: 'Vendor suspended', data: vendor });
});

// ─── PATCH /vendors/:id/commission  (admin) ───────────────────────────────────
export const updateCommission = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await VendorsService.updateCommission(req.params.id, req.body.commissionRate);
  logActivity({ adminId: req.user!.id, action: 'update_commission', entityType: 'vendor', entityId: req.params.id, entityLabel: (vendor as any).storeName?.en || String((vendor as any).storeName), metadata: { commissionRate: req.body.commissionRate }, ipAddress: req.ip });
  sendSuccess({ res, message: 'Commission rate updated', data: vendor });
});

// ─── GET /vendors/:id/stats  (admin) ─────────────────────────────────────────
export const getVendorStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await VendorsService.getVendorStatsById(req.params.id);
  sendSuccess({ res, message: 'Vendor stats retrieved', data: stats });
});

// ─── GET /vendors/me/earnings  (vendor) ──────────────────────────────────────
export const getMyEarnings = asyncHandler(async (req: Request, res: Response) => {
  const earnings = await VendorsService.getMyEarnings(req.user!.id);
  sendSuccess({ res, message: 'Earnings summary retrieved', data: earnings });
});

// ─── GET /vendors/me/payouts  (vendor) ───────────────────────────────────────
export const getMyPayoutHistory = asyncHandler(async (req: Request, res: Response) => {
  const { records, meta } = await VendorsService.getMyPayoutHistory(
    req.user!.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Payout history retrieved', data: records, meta });
});

// ─── GET /vendors/:id/products  (admin) ──────────────────────────────────────
export const getVendorProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, meta } = await VendorsService.getVendorProducts(
    req.params.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Vendor products retrieved', data: products, meta });
});

// ─── GET /vendors/:id/orders  (admin) ────────────────────────────────────────
export const getVendorOrders = asyncHandler(async (req: Request, res: Response) => {
  const { orders, meta } = await VendorsService.getVendorOrders(
    req.params.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Vendor orders retrieved', data: orders, meta });
});

// ─── GET /vendors/me/analytics/overview  (vendor) ────────────────────────────
export const getMyAnalyticsOverview = asyncHandler(async (req: Request, res: Response) => {
  const data = await VendorsService.getMyAnalyticsOverview(req.user!.id);
  sendSuccess({ res, message: 'Analytics overview retrieved', data });
});

// ─── GET /vendors/me/analytics/revenue  (vendor) ─────────────────────────────
export const getMyAnalyticsRevenue = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const data = await VendorsService.getMyAnalyticsRevenue(req.user!.id, from, to);
  sendSuccess({ res, message: 'Revenue chart data retrieved', data });
});

// ─── GET /vendors/me/analytics/top-products  (vendor) ────────────────────────
export const getMyTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const data  = await VendorsService.getMyTopProducts(req.user!.id, limit);
  sendSuccess({ res, message: 'Top products retrieved', data });
});
