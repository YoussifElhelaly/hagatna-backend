import { z } from 'zod';

// ─── Add Item ─────────────────────────────────────────────────────────────────
export const AddCartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').optional(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100 per item'),
});

// ─── Update Quantity ──────────────────────────────────────────────────────────
export const UpdateCartItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')  // 0 = remove item
    .max(100, 'Quantity cannot exceed 100 per item'),
});

// ─── Params ───────────────────────────────────────────────────────────────────
export const CartItemIdParamSchema = z.object({
  itemId: z.string().uuid('Invalid cart item ID'),
});
