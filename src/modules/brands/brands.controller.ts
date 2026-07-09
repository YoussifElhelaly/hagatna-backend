import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as BrandsService from './brands.service';

// ─── GET /brands  (public) ────────────────────────────────────────────────────
export const listBrands = asyncHandler(async (_req: Request, res: Response) => {
  const data = await BrandsService.listBrands();
  sendSuccess({ res, message: 'Brands retrieved', data });
});

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

export const listAllBrandsForAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const data = await BrandsService.listAllBrandsForAdmin();
  sendSuccess({ res, message: 'Brands retrieved', data });
});

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const data = await BrandsService.createBrand(req.body);
  sendSuccess({ res, message: 'Brand created', data });
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const data = await BrandsService.updateBrand(req.params.id, req.body);
  sendSuccess({ res, message: 'Brand updated', data });
});

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  await BrandsService.deleteBrand(req.params.id);
  sendSuccess({ res, message: 'Brand deleted (soft delete)' });
});
