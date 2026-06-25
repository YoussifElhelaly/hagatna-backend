import { prisma } from '@database/prisma/client';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import { ApiError } from '@shared/utils/ApiError';

// ─── Product shape returned inside wishlist items ──────────────────────────────
const wishlistProductSelect = {
  id:            true,
  name:          true,
  slug:          true,
  price:         true,
  comparePrice:  true,
  stockQuantity: true,
  status:        true,
  images: {
    where:   { isPrimary: true },
    select:  { url: true, altText: true },
    take:    1,
  },
  vendor: {
    select: { id: true, storeName: true, storeSlug: true, mediaAssets: { where: { folder: 'vendors/logos' }, select: { url: true, id: true }, take: 1 } },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// getWishlist — paginated list of wishlist items for the user
// ─────────────────────────────────────────────────────────────────────────────
export const getWishlist = async (
  userId: string,
  page  = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where:   { userId },
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:        true,
        createdAt: true,
        product:   { select: wishlistProductSelect },
      },
    }),
    prisma.wishlist.count({ where: { userId } }),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// toggleWishlist — add if absent, remove if present (toggle)
// Returns { added: true } or { added: false }
// ─────────────────────────────────────────────────────────────────────────────
export const toggleWishlist = async (
  userId:    string,
  productId: string,
): Promise<{ added: boolean; wishlistId?: string }> => {
  // Verify the product exists and is active
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { id: true, status: true },
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.status !== 'active') throw ApiError.badRequest('Product is not available');

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    // Already in wishlist → remove
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return { added: false };
  }

  // Not in wishlist → add
  const created = await prisma.wishlist.create({
    data: { userId, productId },
  });
  return { added: true, wishlistId: created.id };
};

// ─────────────────────────────────────────────────────────────────────────────
// removeFromWishlist — explicit remove (used by DELETE endpoint)
// ─────────────────────────────────────────────────────────────────────────────
export const removeFromWishlist = async (
  userId:    string,
  productId: string,
): Promise<void> => {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!existing) throw ApiError.notFound('Product not in wishlist');
  await prisma.wishlist.delete({ where: { id: existing.id } });
};

// ─────────────────────────────────────────────────────────────────────────────
// checkWishlist — returns a Set of productIds that are in the user's wishlist
// Used on product listing pages to show filled/empty heart icons
// ─────────────────────────────────────────────────────────────────────────────
export const checkWishlist = async (
  userId:     string,
  productIds: string[],
): Promise<Record<string, boolean>> => {
  if (!productIds.length) return {};

  const rows = await prisma.wishlist.findMany({
    where: {
      userId,
      productId: { in: productIds },
    },
    select: { productId: true },
  });

  const inWishlist = new Set(rows.map((r) => r.productId));

  // Return a map: { productId: true/false }
  return Object.fromEntries(productIds.map((id) => [id, inWishlist.has(id)]));
};

// ─────────────────────────────────────────────────────────────────────────────
// clearWishlist — remove all items
// ─────────────────────────────────────────────────────────────────────────────
export const clearWishlist = async (userId: string): Promise<{ deleted: number }> => {
  const { count } = await prisma.wishlist.deleteMany({ where: { userId } });
  return { deleted: count };
};
