import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import { uploadSingle } from '@modules/upload/upload.service';
import * as PayoutsService from './payouts.service';

// ─── GET /admin/payouts ───────────────────────────────────────────────────────
export const listPayouts = asyncHandler(async (req: Request, res: Response) => {
  const { payouts, meta } = await PayoutsService.listPayouts(req.query as never);
  sendSuccess({ res, message: 'Payouts retrieved', data: payouts, meta });
});

// ─── PATCH /admin/payouts/:id/approve ────────────────────────────────────────
// Accepts optional multipart/form-data with field "image" as payment proof
export const approvePayout = asyncHandler(async (req: Request, res: Response) => {
  let proof: { url: string; publicId: string } | undefined;

  if (req.file) {
    proof = await uploadSingle(req.file, 'payouts');
  }

  const payout = await PayoutsService.approvePayout(req.params.id, proof);
  sendSuccess({ res, message: 'Payout approved — commission marked as paid', data: payout });
});

// ─── GET /admin/commissions/summary ──────────────────────────────────────────
export const getCommissionsSummary = asyncHandler(async (req: Request, res: Response) => {
  const vendorId = req.query.vendorId as string | undefined;
  const data = await PayoutsService.getCommissionsSummary(vendorId);
  sendSuccess({ res, message: 'Commissions summary retrieved', data });
});
