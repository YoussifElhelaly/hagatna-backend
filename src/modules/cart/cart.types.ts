// ─── Add Item ─────────────────────────────────────────────────────────────────
export interface AddCartItemInput {
  productId: string;
  variantId?: string;   // required only if the product has variants
  quantity: number;
}

// ─── Update Quantity ──────────────────────────────────────────────────────────
export interface UpdateCartItemInput {
  quantity: number;     // 0 = remove the item
}
