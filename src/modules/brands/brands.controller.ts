import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as BrandsService from './brands.service';

// ─── GET /brands  (public) ────────────────────────────────────────────────────
export const listBrands = asyncHandler(async (_req: Request, res: Response) => {
  const data = await BrandsService.listBrands();
  sendSuccess({ res, message: 'Brands retrieved', data });
});
