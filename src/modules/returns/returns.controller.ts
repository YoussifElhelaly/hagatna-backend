import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import type { JwtPayload } from '@shared/types';
import * as ReturnsService from './returns.service';

// ─── POST /returns  (customer) ────────────────────────────────────────────────
export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const refund = await ReturnsService.requestReturn(userId, req.body);
  sendCreated(res, 'Return request submitted successfully', refund);
});

// ─── GET /returns  (customer) ─────────────────────────────────────────────────
export const listMyReturns = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as 'pending' | 'completed' | 'failed' | undefined;

  const result = await ReturnsService.listMyReturns(userId, page, limit, status);
  sendSuccess({ res, message: 'Returns retrieved', data: result.refunds, meta: result.meta });
});

// ─── GET /returns/:id  (customer) ────────────────────────────────────────────
export const getMyReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const refund = await ReturnsService.getMyReturn(userId, req.params.id);
  sendSuccess({ res, message: 'Return retrieved', data: refund });
});

// ─── GET /vendor/returns  (vendor) ──────────────────────────────────────────
export const vendorListReturns = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as 'pending' | 'completed' | 'failed' | undefined;

  const result = await ReturnsService.vendorListReturns(userId, page, limit, status);
  sendSuccess({ res, message: 'Vendor returns retrieved', data: result.refunds, meta: result.meta });
});

// ─── GET /admin/returns  (admin) ──────────────────────────────────────────────
export const adminListReturns = asyncHandler(async (req: Request, res: Response) => {
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as 'pending' | 'completed' | 'failed' | undefined;

  const result = await ReturnsService.adminListReturns({ page, limit, status });
  sendSuccess({ res, message: 'All returns retrieved', data: result.refunds, meta: result.meta });
});

// ─── PATCH /admin/returns/:id/approve  (admin) ───────────────────────────────
export const approveReturn = asyncHandler(async (req: Request, res: Response) => {
  const refundAmount = req.body.refundAmount as number | undefined;
  const refund = await ReturnsService.approveReturn(req.params.id, refundAmount);
  sendSuccess({ res, message: 'Return approved successfully', data: refund });
});

// ─── PATCH /admin/returns/:id/reject  (admin) ────────────────────────────────
export const rejectReturn = asyncHandler(async (req: Request, res: Response) => {
  const note = req.body.note as string | undefined;
  const refund = await ReturnsService.rejectReturn(req.params.id, note);
  sendSuccess({ res, message: 'Return rejected', data: refund });
});
