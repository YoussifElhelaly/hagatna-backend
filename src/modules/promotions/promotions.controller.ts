import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import * as PromotionsService from './promotions.service';

// ─── GET /promotions/validate  (authenticated) ────────────────────────────────
export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await PromotionsService.validateCoupon(req.user!.id, req.query as never);
  sendSuccess({ res, message: 'Coupon is valid', data: result });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const listPromotions = asyncHandler(async (req: Request, res: Response) => {
  const { promotions, meta } = await PromotionsService.listPromotions(req.query as never);
  sendSuccess({ res, message: 'Promotions retrieved', data: promotions, meta });
});

export const getPromotion = asyncHandler(async (req: Request, res: Response) => {
  const promotion = await PromotionsService.getPromotion(req.params.id);
  sendSuccess({ res, message: 'Promotion retrieved', data: promotion });
});

export const createPromotion = asyncHandler(async (req: Request, res: Response) => {
  const promotion = await PromotionsService.createPromotion(req.body);
  sendCreated(res, 'Promotion created', promotion);
});

export const updatePromotion = asyncHandler(async (req: Request, res: Response) => {
  const promotion = await PromotionsService.updatePromotion(req.params.id, req.body);
  sendSuccess({ res, message: 'Promotion updated', data: promotion });
});

export const deletePromotion = asyncHandler(async (req: Request, res: Response) => {
  const result = await PromotionsService.deletePromotion(req.params.id);
  sendSuccess({ res, message: result.message, data: null });
});

// ─── Vendor ───────────────────────────────────────────────────────────────────

export const listVendorPromotions = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await resolveVendor(req.user!.id);
  const { promotions, meta } = await PromotionsService.listPromotions(
    req.query as never,
    vendor.id
  );
  sendSuccess({ res, message: 'Your promotions retrieved', data: promotions, meta });
});

export const getVendorPromotion = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await resolveVendor(req.user!.id);
  const promotion = await PromotionsService.getPromotion(req.params.id, vendor.id);
  sendSuccess({ res, message: 'Promotion retrieved', data: promotion });
});

export const createVendorPromotion = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await resolveVendor(req.user!.id);
  const promotion = await PromotionsService.createPromotion(req.body, vendor.id);
  sendCreated(res, 'Promotion created', promotion);
});

export const updateVendorPromotion = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await resolveVendor(req.user!.id);
  const promotion = await PromotionsService.updatePromotion(req.params.id, req.body, vendor.id);
  sendSuccess({ res, message: 'Promotion updated', data: promotion });
});

export const deleteVendorPromotion = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await resolveVendor(req.user!.id);
  const result = await PromotionsService.deletePromotion(req.params.id, vendor.id);
  sendSuccess({ res, message: result.message, data: null });
});

// ─── Internal helper ──────────────────────────────────────────────────────────
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';

const resolveVendor = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor || vendor.status !== 'approved') {
    throw ApiError.forbidden('Approved vendor account required');
  }
  return vendor;
};
