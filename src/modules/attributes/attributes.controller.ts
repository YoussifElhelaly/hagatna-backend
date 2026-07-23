import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as AttributesService from './attributes.service';

// ─── GET /attributes?categoryId=  (public) ───────────────────────────────────
export const listDefinitions = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.query as { categoryId: string };
  const definitions = await AttributesService.listDefinitions(categoryId);
  sendSuccess({ res, message: 'Attribute definitions retrieved', data: definitions });
});

// ─── GET /attributes/facets?categoryId=  (public) ────────────────────────────
export const getFacets = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.query as { categoryId: string };
  const facets = await AttributesService.getFacets(categoryId);
  sendSuccess({ res, message: 'Attribute facets retrieved', data: facets });
});

// ─── GET /attributes/:id  (admin) ────────────────────────────────────────────
export const getDefinition = asyncHandler(async (req: Request, res: Response) => {
  const def = await AttributesService.getDefinition(req.params.id);
  sendSuccess({ res, message: 'Attribute definition retrieved', data: def });
});

// ─── POST /attributes  (admin) ───────────────────────────────────────────────
export const createDefinition = asyncHandler(async (req: Request, res: Response) => {
  const def = await AttributesService.createDefinition(req.body);
  sendCreated(res, 'Attribute definition created', def);
});

// ─── PATCH /attributes/:id  (admin) ──────────────────────────────────────────
export const updateDefinition = asyncHandler(async (req: Request, res: Response) => {
  const def = await AttributesService.updateDefinition(req.params.id, req.body);
  sendSuccess({ res, message: 'Attribute definition updated', data: def });
});

// ─── DELETE /attributes/:id  (admin) ─────────────────────────────────────────
export const deleteDefinition = asyncHandler(async (req: Request, res: Response) => {
  await AttributesService.deleteDefinition(req.params.id);
  sendSuccess({ res, message: 'Attribute definition deleted', data: null });
});

// ─── GET /attributes/product/:productId  (public) ────────────────────────────
export const getProductAttributes = asyncHandler(async (req: Request, res: Response) => {
  const attrs = await AttributesService.getProductAttributes(req.params.productId);
  sendSuccess({ res, message: 'Product attributes retrieved', data: attrs });
});

// ─── PUT /attributes/product/:productId  (vendor / admin) ────────────────────
export const setProductAttributes = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const attrs = await AttributesService.setProductAttributes(
    req.user!.id,
    isAdmin,
    req.params.productId,
    req.body.attributes,
  );
  sendSuccess({ res, message: 'Product attributes saved', data: attrs });
});
