import { Decimal } from '@prisma/client/runtime/library';
import { ProductStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import type { AddCartItemInput, UpdateCartItemInput, ReplaceCartInput } from './cart.types';

// ─── Cart item select ─────────────────────────────────────────────────────────
const cartItemSelect = {
  id: true,
  quantity: true,
  priceSnapshot: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      stockQuantity: true,
      images: {
        where: { isPrimary: true },
        select: { url: true, altText: true },
        take: 1,
      },
      vendor: { select: { id: true, storeName: true, storeSlug: true } },
    },
  },
  variant: {
    select: {
      id: true,
      name: true,
      options: true,
      price: true,
      stockQuantity: true,
      imageUrl: true,
      isActive: true,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: get or create the cart for a user
// ─────────────────────────────────────────────────────────────────────────────
const getOrCreateCart = async (userId: string) => {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: compute cart totals from items
// ─────────────────────────────────────────────────────────────────────────────
const computeTotals = (items: Array<{ quantity: number; priceSnapshot: Decimal }>) => {
  let subtotal = 0;
  let itemCount = 0;
  for (const item of items) {
    subtotal += Number(item.priceSnapshot) * item.quantity;
    itemCount += item.quantity;
  }
  return {
    subtotal: Number(subtotal.toFixed(2)),
    itemCount,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getCart  —  return cart with items and computed totals
// ─────────────────────────────────────────────────────────────────────────────
export const getCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: cartItemSelect,
    orderBy: { id: 'asc' },
  });

  const totals = computeTotals(items);

  return {
    id: cart.id,
    items,
    ...totals,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// addItem  —  add to cart or increment quantity if item already exists
// ─────────────────────────────────────────────────────────────────────────────
export const addItem = async (userId: string, input: AddCartItemInput) => {
  const { productId, variantId, quantity } = input;

  // ── Validate product ──────────────────────────────────────────────────────
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { vendor: { select: { status: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.status !== ProductStatus.active) {
    throw ApiError.badRequest('This product is not available');
  }
  if (product.vendor.status !== 'approved') {
    throw ApiError.badRequest('This product is not available');
  }

  // ── Determine price and available stock ───────────────────────────────────
  let priceSnapshot: number;
  let availableStock: number;

  if (variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw ApiError.notFound('Variant not found');
    }
    if (!variant.isActive) throw ApiError.badRequest('This variant is not available');
    priceSnapshot = Number(variant.price);
    availableStock = variant.stockQuantity;
  } else {
    priceSnapshot = Number(product.price);
    availableStock = product.stockQuantity;
  }

  // ── Get or create cart ────────────────────────────────────────────────────
  const cart = await getOrCreateCart(userId);

  // ── Upsert: increment quantity if item already in cart ────────────────────
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      variantId: variantId ?? null,
    },
  });

  const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  if (newQuantity > availableStock) {
    throw ApiError.badRequest(
      `Only ${availableStock} unit(s) available. You already have ${existingItem?.quantity ?? 0} in your cart.`
    );
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity, priceSnapshot },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity, priceSnapshot },
    });
  }

  // Touch cart updatedAt
  await prisma.cart.update({ where: { id: cart.id }, data: {} });

  return getCart(userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// replaceCart  —  atomically set the cart to exactly this list of items.
//
// Used to sync a client-side cart to the server (e.g. at checkout). Unlike
// addItem, quantities here are absolute, not additive, and the whole swap
// happens in one transaction — so two concurrent syncs for the same account
// (e.g. two open tabs/devices) can't interleave into doubled quantities the
// way a separate delete-call-then-repost-loop could.
// ─────────────────────────────────────────────────────────────────────────────
export const replaceCart = async (userId: string, input: ReplaceCartInput) => {
  // De-dupe identical (productId, variantId) lines by summing quantities.
  const merged = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const i of input.items) {
    const k = `${i.productId}:${i.variantId ?? ''}`;
    const existing = merged.get(k);
    merged.set(k, {
      productId: i.productId,
      variantId: i.variantId ?? null,
      quantity: (existing?.quantity ?? 0) + i.quantity,
    });
  }
  const lines = [...merged.values()];

  // ── Validate every product/variant and snapshot its price ─────────────────
  const priced: Array<{ productId: string; variantId: string | null; quantity: number; priceSnapshot: number }> = [];
  for (const line of lines) {
    const product = await prisma.product.findUnique({
      where: { id: line.productId },
      include: { vendor: { select: { status: true } } },
    });
    if (!product) throw ApiError.notFound('Product not found');
    if (product.status !== ProductStatus.active) {
      throw ApiError.badRequest(`Product "${(product.name as { en: string }).en}" is not available`);
    }
    if (product.vendor.status !== 'approved') {
      throw ApiError.badRequest(`Product "${(product.name as { en: string }).en}" is not available`);
    }

    let priceSnapshot: number;
    let availableStock: number;
    if (line.variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: line.variantId } });
      if (!variant || variant.productId !== line.productId) throw ApiError.notFound('Variant not found');
      if (!variant.isActive) throw ApiError.badRequest('This variant is not available');
      priceSnapshot = Number(variant.price);
      availableStock = variant.stockQuantity;
    } else {
      priceSnapshot = Number(product.price);
      availableStock = product.stockQuantity;
    }
    if (line.quantity > availableStock) {
      throw ApiError.badRequest(`Only ${availableStock} unit(s) available for "${(product.name as { en: string }).en}"`);
    }
    priced.push({ ...line, priceSnapshot });
  }

  const cart = await getOrCreateCart(userId);

  // ── Swap the cart's contents in one transaction ────────────────────────────
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    ...priced.map((line) =>
      prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          priceSnapshot: line.priceSnapshot,
        },
      })
    ),
    prisma.cart.update({ where: { id: cart.id }, data: {} }),
  ]);

  return getCart(userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// updateItemQuantity  —  set exact quantity; quantity=0 removes the item
// ─────────────────────────────────────────────────────────────────────────────
export const updateItemQuantity = async (
  userId: string,
  itemId: string,
  input: UpdateCartItemInput
) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw ApiError.notFound('Cart not found');

  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.cartId !== cart.id) throw ApiError.notFound('Cart item not found');

  // quantity = 0 → remove
  if (input.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    await prisma.cart.update({ where: { id: cart.id }, data: {} });
    return getCart(userId);
  }

  // Validate stock for the new quantity
  const product = await prisma.product.findUnique({ where: { id: item.productId } });
  if (!product) throw ApiError.notFound('Product no longer exists');
  if (product.status !== ProductStatus.active) {
    throw ApiError.badRequest('This product is no longer available');
  }

  let availableStock = product.stockQuantity;
  if (item.variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (variant) availableStock = variant.stockQuantity;
  }

  if (input.quantity > availableStock) {
    throw ApiError.badRequest(`Only ${availableStock} unit(s) available`);
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: input.quantity },
  });

  await prisma.cart.update({ where: { id: cart.id }, data: {} });
  return getCart(userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// removeItem  —  delete a single cart item
// ─────────────────────────────────────────────────────────────────────────────
export const removeItem = async (userId: string, itemId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw ApiError.notFound('Cart not found');

  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.cartId !== cart.id) throw ApiError.notFound('Cart item not found');

  await prisma.cartItem.delete({ where: { id: itemId } });
  await prisma.cart.update({ where: { id: cart.id }, data: {} });

  return getCart(userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// clearCart  —  remove all items (keep the cart row)
// ─────────────────────────────────────────────────────────────────────────────
export const clearCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return { id: null, items: [], subtotal: 0, itemCount: 0 };

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: {} });

  return { id: cart.id, items: [], subtotal: 0, itemCount: 0 };
};
