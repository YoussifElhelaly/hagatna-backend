import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as PlansService from './vendor-plans.service';
import type { VendorPlansListQuery } from './vendor-plans.types';

// ─── Public ───────────────────────────────────────────────────────────────────

export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlansService.listPlans(req.query as unknown as VendorPlansListQuery, false);
  sendSuccess({ res, message: 'Plans retrieved', data: result });
});

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await PlansService.getPlan(req.params.id);
  sendSuccess({ res, message: 'Plan retrieved', data: { plan } });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const listPlansAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlansService.listPlans(req.query as unknown as VendorPlansListQuery, true);
  sendSuccess({ res, message: 'Plans retrieved', data: result });
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await PlansService.createPlan(req.body);
  sendSuccess({ res, statusCode: 201, message: 'Plan created', data: { plan } });
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await PlansService.updatePlan(req.params.id, req.body);
  sendSuccess({ res, message: 'Plan updated', data: { plan } });
});

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  await PlansService.deletePlan(req.params.id);
  sendSuccess({ res, statusCode: 204, message: 'Plan deleted' });
});

export const getVendorsOnPlan = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await PlansService.getVendorsOnPlan(req.params.id, page, limit);
  sendSuccess({ res, message: 'Vendors retrieved', data: result });
});
