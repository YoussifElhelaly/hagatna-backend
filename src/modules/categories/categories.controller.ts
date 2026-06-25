import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import * as CategoriesService from './categories.service';

// ─── GET /categories  (public) ────────────────────────────────────────────────
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await CategoriesService.listCategories();
  sendSuccess({ res, message: 'Categories retrieved', data: categories });
});

// ─── GET /categories/:slug  (public) ─────────────────────────────────────────
export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoriesService.getCategoryBySlug(req.params.slug);
  sendSuccess({ res, message: 'Category retrieved', data: category });
});

// ─── POST /categories  (admin) ────────────────────────────────────────────────
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoriesService.createCategory(req.body);
  sendCreated(res, 'Category created successfully', category);
});

// ─── PATCH /categories/:id  (admin) ──────────────────────────────────────────
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoriesService.updateCategory(req.params.id, req.body);
  sendSuccess({ res, message: 'Category updated successfully', data: category });
});

// ─── DELETE /categories/:id  (admin) ─────────────────────────────────────────
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await CategoriesService.deleteCategory(req.params.id);
  sendSuccess({ res, message: 'Category deleted successfully', data: null });
});
