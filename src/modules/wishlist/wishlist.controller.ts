import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import { ApiError } from '@shared/utils/ApiError';
import type { JwtPayload } from '@shared/types';
import * as wishlistService from './wishlist.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /wishlist ────────────────────────────────────────────────────────────
// Returns the authenticated user's paginated wishlist.
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await wishlistService.getWishlist(userId, page, limit);

  return sendSuccess({ res, message: 'Wishlist retrieved', data: result.items, meta: result.meta });
});

// ─── POST /wishlist/:productId ────────────────────────────────────────────────
// Toggle: adds product if absent, removes if present.
export const toggleWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const { productId } = req.params;

  if (!productId) throw ApiError.badRequest('productId is required');

  const result = await wishlistService.toggleWishlist(userId, productId);
  const message = result.added ? 'Added to wishlist' : 'Removed from wishlist';

  logActivity({
    userId,
    role: 'customer',
    category: 'wishlist',
    action: result.added ? 'add_to_wishlist' : 'remove_from_wishlist',
    entityType: 'product',
    entityId: productId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return sendSuccess({ res, message, data: result });
});

// ─── DELETE /wishlist/:productId ──────────────────────────────────────────────
// Explicit remove — no-op if not in wishlist (throws 404).
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const { productId } = req.params;

  if (!productId) throw ApiError.badRequest('productId is required');

  await wishlistService.removeFromWishlist(userId, productId);

  return sendSuccess({ res, message: 'Removed from wishlist' });
});

// ─── POST /wishlist/check ─────────────────────────────────────────────────────
// Body: { productIds: string[] }
// Returns: { "uuid1": true, "uuid2": false, ... }
// Used on product grids to render filled/empty heart icons efficiently.
export const checkWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const { productIds } = req.body as { productIds?: string[] };

  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw ApiError.badRequest('productIds must be a non-empty array');
  }
  if (productIds.length > 100) {
    throw ApiError.badRequest('Maximum 100 productIds per request');
  }

  const result = await wishlistService.checkWishlist(userId, productIds);

  return sendSuccess({ res, message: 'Wishlist check complete', data: result });
});

// ─── DELETE /wishlist ─────────────────────────────────────────────────────────
// Clear the entire wishlist.
export const clearWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;

  const result = await wishlistService.clearWishlist(userId);

  return sendSuccess({ res, message: `Wishlist cleared (${result.deleted} items removed)`, data: result });
});
