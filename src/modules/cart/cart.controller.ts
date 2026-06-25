import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import * as CartService from './cart.service';

// ─── GET /cart ────────────────────────────────────────────────────────────────
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await CartService.getCart(req.user!.id);
  sendSuccess({ res, message: 'Cart retrieved', data: cart });
});

// ─── POST /cart/items ─────────────────────────────────────────────────────────
export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await CartService.addItem(req.user!.id, req.body);
  sendCreated(res, 'Item added to cart', cart);
});

// ─── PATCH /cart/items/:itemId ────────────────────────────────────────────────
export const updateItemQuantity = asyncHandler(async (req: Request, res: Response) => {
  const cart = await CartService.updateItemQuantity(
    req.user!.id,
    req.params.itemId,
    req.body
  );
  sendSuccess({ res, message: 'Cart updated', data: cart });
});

// ─── DELETE /cart/items/:itemId ───────────────────────────────────────────────
export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await CartService.removeItem(req.user!.id, req.params.itemId);
  sendSuccess({ res, message: 'Item removed from cart', data: cart });
});

// ─── DELETE /cart ─────────────────────────────────────────────────────────────
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await CartService.clearCart(req.user!.id);
  sendSuccess({ res, message: 'Cart cleared', data: cart });
});

// ─── GET /cart/admin/users/:userId  (admin only) ──────────────────────────────
export const getAdminUserCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await CartService.getCart(req.params.userId);
  sendSuccess({ res, message: 'User cart retrieved', data: cart });
});
