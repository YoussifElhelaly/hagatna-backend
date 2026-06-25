import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { z } from 'zod';
import {
  AddCartItemSchema,
  UpdateCartItemSchema,
  CartItemIdParamSchema,
} from './cart.validation';
import * as CartController from './cart.controller';
import { ROLES } from '@shared/constants/roles';

const router = Router();

// All cart routes require authentication — no guest carts
router.use(authenticate);

// ─── GET /api/v1/cart/admin/users/:userId  (admin only) ───────────────────────
// Must be BEFORE the /:itemId routes to avoid param collision
router.get(
  '/admin/users/:userId',
  authorize(ROLES.ADMIN),
  validate({ params: z.object({ userId: z.string().uuid() }) }),
  CartController.getAdminUserCart
);

// ─── GET  /api/v1/cart ────────────────────────────────────────────────────────
router.get('/', CartController.getCart);

// ─── POST /api/v1/cart/items ──────────────────────────────────────────────────
router.post(
  '/items',
  validate({ body: AddCartItemSchema }),
  CartController.addItem
);

// ─── PATCH /api/v1/cart/items/:itemId ────────────────────────────────────────
router.patch(
  '/items/:itemId',
  validate({ params: CartItemIdParamSchema, body: UpdateCartItemSchema }),
  CartController.updateItemQuantity
);

// ─── DELETE /api/v1/cart/items/:itemId ───────────────────────────────────────
router.delete(
  '/items/:itemId',
  validate({ params: CartItemIdParamSchema }),
  CartController.removeItem
);

// ─── DELETE /api/v1/cart ──────────────────────────────────────────────────────
router.delete('/', CartController.clearCart);

export default router;
