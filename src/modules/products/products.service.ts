import { ProductStatus, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';
import { ApiError } from '@shared/utils/ApiError';
import { generateUniqueSlug } from '@shared/utils/generateSlug';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import { notify } from '@modules/notifications/notifications.service';
import { getDescendantIds } from '@shared/utils/categoryTree';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductVariantInput,
  UpdateVariantInput,
  ProductImageInput,
  ProductsListQuery,
  VendorProductsListQuery,
} from './products.types';

// ─── Shared selects ───────────────────────────────────────────────────────────
const productBaseSelect = {
  id: true,
  vendorId: true,
  categoryId: true,
  name: true,
  description: true,
  slug: true,
  price: true,
  comparePrice: true,
  shippingClassId: true,
  shippingClass: {
    select: { id: true, name: true, baseCost: true, extraUnitCost: true, maxCost: true },
  },
  sku: true,
  stockQuantity: true,
  lowStockThreshold: true,
  status: true,
  isFeatured: true,
  viewsCount: true,
  approvalNote: true,
  createdAt: true,
  updatedAt: true,
};

const productDetailSelect = {
  ...productBaseSelect,
  costPrice: true,
  vendor: {
    select: {
      id: true,
      storeName: true,
      storeSlug: true,
      verifiedAt: true,
      mediaAssets: {
        where: { folder: 'vendors/logos' },
        select: { url: true, id: true },
        take: 1,
      },
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true },
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  },
  variants: {
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      options: true,
      price: true,
      comparePrice: true,
      sku: true,
      stockQuantity: true,
      imageUrl: true,
      isActive: true,
    },
  },
  tags: { select: { tag: true } },
  attributes: {
    select: {
      value: true,
      definition: {
        select: { key: true, label: true, type: true, unit: true, sortOrder: true },
      },
    },
    orderBy: { definition: { sortOrder: 'asc' as const } },
  },
  _count: {
    select: {
      reviews: { where: { status: 'approved' as const, deletedAt: null } },
    },
  },
};

// ─── Wishlist helper ──────────────────────────────────────────────────────────

/**
 * Given a list of products and an optional userId, returns the same products
 * with an `isWishlisted` boolean attached to each.
 * Single DB query regardless of how many products are in the list.
 */
const attachWishlistStatus = async <T extends { id: string }>(
  products: T[],
  userId?: string,
): Promise<(T & { isWishlisted: boolean })[]> => {
  if (!userId || !products.length) {
    return products.map((p) => ({ ...p, isWishlisted: false }));
  }

  const ids = products.map((p) => p.id);
  const wishlisted = await prisma.wishlist.findMany({
    where:  { userId, productId: { in: ids } },
    select: { productId: true },
  });
  const wishlistedSet = new Set(wishlisted.map((w) => w.productId));

  return products.map((p) => ({ ...p, isWishlisted: wishlistedSet.has(p.id) }));
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Resolve vendor profile from userId — 403 if missing or not approved */
const resolveVendor = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');
  if (vendor.status !== 'approved') {
    throw ApiError.forbidden('Only approved vendors can manage products');
  }
  return vendor;
};

/** Verify the product exists (not deleted) and belongs to the given vendor */
const verifyOwnership = async (vendorId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.vendorId !== vendorId) throw ApiError.forbidden('You do not own this product');
  return product;
};

/** Invalidate per-product cache and featured cache */
const invalidateProductCache = async (slug: string) => {
  await Promise.all([
    redis.del(RedisKeys.cache.product(slug)),
    redis.del(RedisKeys.cache.featuredProducts()),
  ]);
};

// ─────────────────────────────────────────────────────────────────────────────
// listProducts  —  public, active + not soft-deleted
// ─────────────────────────────────────────────────────────────────────────────
export const listProducts = async (query: ProductsListQuery, userId?: string) => {
  const {
    page = 1, limit = 20, categoryId, vendorId,
    minPrice, maxPrice, search, tag, isFeatured, sort = 'newest',
    attrs,
  } = query;
  const skip = (page - 1) * limit;

  // Resolve category + all its descendants so parent-category queries include subcategory products
  let categoryIds: string[] | undefined;
  if (categoryId) {
    const descendants = await getDescendantIds(categoryId);
    categoryIds = [categoryId, ...descendants];
  }

  // Build one AND condition per attribute filter so a product must satisfy ALL
  const attrConditions: Prisma.ProductWhereInput[] =
    attrs && Object.keys(attrs).length > 0
      ? Object.entries(attrs).map(([key, value]) => ({
          attributes: {
            some: {
              value,
              definition: { key },
            },
          },
        }))
      : [];

  const where: Prisma.ProductWhereInput = {
    status: ProductStatus.active,
    deletedAt: null,
    ...(categoryIds && { categoryId: { in: categoryIds } }),
    ...(vendorId && { vendorId }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { name: { path: ['en'], string_contains: search } },
        { name: { path: ['ar'], string_contains: search } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(tag && {
      tags: { some: { tag: { equals: tag, mode: 'insensitive' } } },
    }),
    ...(attrConditions.length > 0 && { AND: attrConditions }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc'  ? { price: 'asc' }
    : sort === 'price_desc' ? { price: 'desc' }
    : sort === 'popular'    ? { viewsCount: 'desc' }
    : { createdAt: 'desc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        ...productBaseSelect,
        images: {
          where: { isPrimary: true },
          select: { url: true, altText: true },
          take: 1,
        },
        tags: { select: { tag: true } },
        vendor: { select: { id: true, storeName: true, storeSlug: true, mediaAssets: { where: { folder: 'vendors/logos' }, select: { url: true, id: true }, take: 1 } } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: { where: { status: 'approved' as const, deletedAt: null } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const productsWithWishlist = await attachWishlistStatus(products, userId);
  return { products: productsWithWishlist, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getFeaturedProducts  —  public, cached 10 min
// ─────────────────────────────────────────────────────────────────────────────
export const getFeaturedProducts = async (userId?: string) => {
  const cacheKey = RedisKeys.cache.featuredProducts();
  const cached = await redis.get(cacheKey);

  // Cache stores products WITHOUT isWishlisted (user-specific data must not be cached)
  const products: Array<{ id: string }> = cached
    ? JSON.parse(cached)
    : await (async () => {
        const rows = await prisma.product.findMany({
          where: { status: ProductStatus.active, isFeatured: true, deletedAt: null },
          take: 12,
          orderBy: { viewsCount: 'desc' },
          select: {
            ...productBaseSelect,
            images: {
              where: { isPrimary: true },
              select: { url: true, altText: true },
              take: 1,
            },
            vendor: { select: { id: true, storeName: true, storeSlug: true, mediaAssets: { where: { folder: 'vendors/logos' }, select: { url: true, id: true }, take: 1 } } },
            category: { select: { id: true, name: true, slug: true } },
          },
        });
        await redis.setex(cacheKey, TTL.FEATURED, JSON.stringify(rows));
        return rows;
      })();

  return attachWishlistStatus(products, userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// getProductBySlug  —  public, active + not deleted, cached, increments views
// ─────────────────────────────────────────────────────────────────────────────
export const getProductBySlug = async (slug: string, userId?: string) => {
  const cacheKey = RedisKeys.cache.product(slug);
  const cached = await redis.get(cacheKey);

  let product: ({ id: string } & Record<string, unknown>);

  if (cached) {
    product = JSON.parse(cached) as { id: string } & Record<string, unknown>;
    // Increment views fire-and-forget
    prisma.product
      .updateMany({ where: { slug, deletedAt: null }, data: { viewsCount: { increment: 1 } } })
      .catch(() => null);
  } else {
    const row = await prisma.product.findFirst({
      where:  { slug, deletedAt: null },
      select: productDetailSelect,
    });

    if (!row) throw ApiError.notFound('Product not found');
    if (row.status !== ProductStatus.active) throw ApiError.notFound('Product not found');

    // Cache product WITHOUT isWishlisted
    await redis.setex(cacheKey, TTL.PRODUCT, JSON.stringify(row));
    prisma.product
      .update({ where: { id: row.id }, data: { viewsCount: { increment: 1 } } })
      .catch(() => null);

    product = row as unknown as { id: string } & Record<string, unknown>;
  }

  // Flatten attributes ({ value, definition:{...} } → { key, label, type, unit, value })
  // so the storefront can render specs and comparisons directly
  if (Array.isArray(product.attributes)) {
    product.attributes = (product.attributes as { value: string; definition?: Record<string, unknown> }[]).map(
      (a) => (a.definition ? { ...a.definition, value: a.value } : a)
    );
  }

  // Attach isWishlisted for the requesting user
  const [withWishlist] = await attachWishlistStatus([product], userId);
  return withWishlist;
};

// ─────────────────────────────────────────────────────────────────────────────
// getVendorProducts  —  vendor sees own products (all statuses, not deleted)
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorProducts = async (userId: string, query: VendorProductsListQuery) => {
  const vendor = await resolveVendor(userId);
  const { page = 1, limit = 20, status, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    vendorId: vendor.id,
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { path: ['en'], string_contains: search } },
        { name: { path: ['ar'], string_contains: search } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...productBaseSelect,
        costPrice: true,
        images: {
          where: { isPrimary: true },
          select: { url: true, altText: true },
          take: 1,
        },
        tags: { select: { tag: true } },
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// createProduct  —  vendor only, always starts as 'draft'
// ─────────────────────────────────────────────────────────────────────────────
/** Throws if the given shipping class id doesn't reference an active class */
const verifyShippingClass = async (shippingClassId?: string | null) => {
  if (!shippingClassId) return;
  const cls = await prisma.shippingClass.findFirst({
    where: { id: shippingClassId, isActive: true, deletedAt: null },
  });
  if (!cls) throw ApiError.notFound('Shipping class not found or inactive');
};

export const createProduct = async (userId: string, input: CreateProductInput) => {
  const vendor = await resolveVendor(userId);

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, isActive: true, deletedAt: null },
  });
  if (!category) throw ApiError.notFound('Category not found');
  await verifyShippingClass(input.shippingClassId);

  const { variants = [], images = [], tags = [], ...baseData } = input;
  const slug = await generateUniqueSlug(input.name.en, 'product');
  const normalizedImages = normalizeImages(images);

  const product = await prisma.product.create({
    data: {
      ...baseData,
      vendorId: vendor.id,
      slug,
      status: ProductStatus.draft,   // always draft on create
      variants: variants.length > 0 ? { create: variants } : undefined,
      images: normalizedImages.length > 0 ? { create: normalizedImages } : undefined,
      tags: tags.length > 0 ? { create: tags.map((t) => ({ tag: t })) } : undefined,
    },
    select: productDetailSelect,
  });

  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateProduct  —  vendor only, owns product
// ─────────────────────────────────────────────────────────────────────────────
export const updateProduct = async (
  userId: string,
  productId: string,
  input: UpdateProductInput
) => {
  const vendor = await resolveVendor(userId);
  const existing = await verifyOwnership(vendor.id, productId);

  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, isActive: true, deletedAt: null },
    });
    if (!category) throw ApiError.notFound('Category not found');
  }
  await verifyShippingClass(input.shippingClassId);

  let slug = existing.slug;
  if (input.name?.en && input.name.en !== (existing.name as { en: string }).en) {
    slug = await generateUniqueSlug(input.name.en, 'product', productId);
  }

  const { tags, ...baseData } = input;

  const product = await prisma.$transaction(async (tx) => {
    if (tags !== undefined) {
      await tx.productTag.deleteMany({ where: { productId } });
      if (tags.length > 0) {
        await tx.productTag.createMany({ data: tags.map((tag) => ({ productId, tag })) });
      }
    }
    return tx.product.update({
      where: { id: productId },
      data: { ...baseData, slug } as any,
      select: productDetailSelect,
    });
  });

  await invalidateProductCache(existing.slug);
  if (slug !== existing.slug) await redis.del(RedisKeys.cache.product(slug));
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateProductStatus  —  vendor only
// Allowed: draft | pending_approval | archived
// Admin-only statuses: active, rejected  (handled by approveProduct/rejectProduct)
// ─────────────────────────────────────────────────────────────────────────────
export const updateProductStatus = async (
  userId: string,
  productId: string,
  status: 'draft' | 'pending_approval' | 'archived'
) => {
  const vendor = await resolveVendor(userId);
  const existing = await verifyOwnership(vendor.id, productId);

  if (status === 'pending_approval' && existing.status === ProductStatus.pending_approval) {
    throw ApiError.conflict('Product is already pending approval');
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      status: status as ProductStatus,
      approvalNote: null,    // clear any previous rejection note
    },
    select: productBaseSelect,
  });

  await invalidateProductCache(existing.slug);
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteProduct  —  SOFT DELETE (vendor owns OR admin)
// Slug gets a tombstone suffix to free it for future reuse
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProduct = async (
  userId: string,
  productId: string,
  isAdmin: boolean
) => {
  let product: { id: string; slug: string };

  if (isAdmin) {
    const found = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!found) throw ApiError.notFound('Product not found');
    product = found;
  } else {
    const vendor = await resolveVendor(userId);
    product = await verifyOwnership(vendor.id, productId);
  }

  const tombstoneSlug = `${product.slug}_del_${Date.now()}`;

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), slug: tombstoneSlug, isFeatured: false },
  });

  await invalidateProductCache(product.slug);
};

// ─────────────────────────────────────────────────────────────────────────────
// bulkUpdateProducts  —  vendor updates own; admin updates any
// ─────────────────────────────────────────────────────────────────────────────
export const bulkUpdateProducts = async (
  userId: string,
  ids: string[],
  update: Record<string, unknown>,
  isAdmin: boolean
) => {
  const where: Prisma.ProductWhereInput = { id: { in: ids }, deletedAt: null };

  if (!isAdmin) {
    const vendor = await resolveVendor(userId);
    where.vendorId = vendor.id;
    const owned = await prisma.product.count({ where });
    if (owned !== ids.length) {
      throw ApiError.forbidden('One or more products not found or do not belong to you');
    }
  }

  const { tags, ...data } = update as { tags?: string[]; [k: string]: unknown };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.product.updateMany({ where, data });
    }
    if (tags !== undefined) {
      await tx.productTag.deleteMany({ where: { productId: { in: ids } } });
      if (tags.length > 0) {
        await tx.productTag.createMany({
          data: ids.flatMap((productId) => tags.map((tag) => ({ productId, tag }))),
          skipDuplicates: true,
        });
      }
    }
  });

  return { updated: ids.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// approveProduct  —  admin only
// ─────────────────────────────────────────────────────────────────────────────
export const approveProduct = async (productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: { vendor: { select: { userId: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.status !== ProductStatus.pending_approval) {
    throw ApiError.conflict('Only pending_approval products can be approved');
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { status: ProductStatus.active, approvalNote: null },
    select: productBaseSelect,
  });

  notify.productApproved(
    product.vendor.userId,
    (product.name as { en: string }).en,
    productId
  );

  await invalidateProductCache(product.slug);
  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// rejectProduct  —  admin only
// ─────────────────────────────────────────────────────────────────────────────
export const rejectProduct = async (productId: string, approvalNote: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: { vendor: { select: { userId: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.status !== ProductStatus.pending_approval) {
    throw ApiError.conflict('Only pending_approval products can be rejected');
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { status: ProductStatus.rejected, approvalNote },
    select: productBaseSelect,
  });

  notify.productRejected(
    product.vendor.userId,
    (product.name as { en: string }).en,
    productId,
    approvalNote
  );

  await invalidateProductCache(product.slug);
  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// listPendingApproval  —  admin, products queue (default: pending_approval)
// ─────────────────────────────────────────────────────────────────────────────
export const listPendingApproval = async (query: {
  page?: number;
  limit?: number;
  vendorId?: string;
  search?: string;
  status?: ProductStatus;
}) => {
  const { page = 1, limit = 20, vendorId, search, status = ProductStatus.pending_approval } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    status,
    ...(vendorId && { vendorId }),
    ...(search && {
      OR: [
        { name: { path: ['en'], string_contains: search } },
        { name: { path: ['ar'], string_contains: search } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },   // oldest first — FIFO queue
      select: {
        ...productBaseSelect,
        costPrice: true,
        images: {
          where: { isPrimary: true },
          select: { url: true, altText: true },
          take: 1,
        },
        tags: { select: { tag: true } },
        vendor: {
          select: {
            id: true, storeName: true, storeSlug: true,
            user: { select: { email: true } },
          },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// adminCreateProduct  —  admin creates product for any approved vendor
// ─────────────────────────────────────────────────────────────────────────────
export const adminCreateProduct = async (
  input: CreateProductInput & { vendorId: string; status?: ProductStatus }
) => {
  const { vendorId, status = ProductStatus.draft, variants = [], images = [], tags = [], ...baseData } = input;

  const vendor = await prisma.vendorProfile.findFirst({
    where: { id: vendorId, status: 'approved' },
  });
  if (!vendor) throw ApiError.notFound('Vendor not found or not approved');

  const category = await prisma.category.findFirst({
    where: { id: baseData.categoryId, isActive: true, deletedAt: null },
  });
  if (!category) throw ApiError.notFound('Category not found');
  await verifyShippingClass(baseData.shippingClassId);

  const slug = await generateUniqueSlug((baseData.name as { en: string }).en, 'product');
  const normalizedImages = normalizeImages(images as ProductImageInput[]);

  return prisma.product.create({
    data: {
      ...baseData,
      vendorId,
      slug,
      status,
      variants: variants.length > 0 ? { create: variants } : undefined,
      images: normalizedImages.length > 0 ? { create: normalizedImages } : undefined,
      tags: tags.length > 0 ? { create: tags.map((t) => ({ tag: t })) } : undefined,
    },
    select: productDetailSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// adminGetProduct  —  admin fetches any product by ID (any status, full detail)
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetProduct = async (productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: productDetailSelect,
  });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// adminUpdateProduct  —  admin updates any product (any status allowed)
// ─────────────────────────────────────────────────────────────────────────────
export const adminUpdateProduct = async (
  productId: string,
  input: UpdateProductInput & { status?: ProductStatus }
) => {
  const existing = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Product not found');

  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, isActive: true, deletedAt: null },
    });
    if (!category) throw ApiError.notFound('Category not found');
  }
  await verifyShippingClass(input.shippingClassId);

  let slug = existing.slug;
  if (input.name?.en && input.name.en !== (existing.name as { en: string }).en) {
    slug = await generateUniqueSlug(input.name.en, 'product', productId);
  }

  const { tags, images, status, ...baseData } = input;
  const normalizedImages = images ? normalizeImages(images) : undefined;

  const product = await prisma.$transaction(async (tx) => {
    // Full-replace tags if provided
    if (tags !== undefined) {
      await tx.productTag.deleteMany({ where: { productId } });
      if (tags.length > 0) {
        await tx.productTag.createMany({ data: tags.map((tag) => ({ productId, tag })) });
      }
    }
    // Full-replace images if provided
    if (normalizedImages !== undefined) {
      await tx.productImage.deleteMany({ where: { productId } });
      if (normalizedImages.length > 0) {
        await tx.productImage.createMany({
          data: normalizedImages.map((img) => ({ ...img, productId })),
        });
      }
    }
    return tx.product.update({
      where: { id: productId },
      data: { ...baseData, slug, ...(status && { status }) },
      select: productDetailSelect,
    });
  });

  await invalidateProductCache(existing.slug);
  if (slug !== existing.slug) await redis.del(RedisKeys.cache.product(slug));
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// toggleFeatured  —  admin only
// ─────────────────────────────────────────────────────────────────────────────
export const toggleFeatured = async (productId: string) => {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw ApiError.notFound('Product not found');

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { isFeatured: !product.isFeatured },
    select: { id: true, slug: true, isFeatured: true },
  });

  await invalidateProductCache(product.slug);
  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// addVariant  —  vendor only
// ─────────────────────────────────────────────────────────────────────────────
export const addVariant = async (
  userId: string,
  productId: string,
  input: ProductVariantInput
) => {
  const vendor = await resolveVendor(userId);
  const product = await verifyOwnership(vendor.id, productId);

  const variant = await prisma.productVariant.create({
    data: { ...input, productId },
    select: {
      id: true, name: true, options: true, price: true,
      comparePrice: true, sku: true, stockQuantity: true,
      imageUrl: true, isActive: true,
    },
  });

  await invalidateProductCache(product.slug);
  return variant;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateVariant  —  vendor only
// ─────────────────────────────────────────────────────────────────────────────
export const updateVariant = async (
  userId: string,
  productId: string,
  variantId: string,
  input: UpdateVariantInput
) => {
  const vendor = await resolveVendor(userId);
  const product = await verifyOwnership(vendor.id, productId);

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId, deletedAt: null },
  });
  if (!variant) throw ApiError.notFound('Variant not found');

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: input,
    select: {
      id: true, name: true, options: true, price: true,
      comparePrice: true, sku: true, stockQuantity: true,
      imageUrl: true, isActive: true,
    },
  });

  await invalidateProductCache(product.slug);
  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteVariant  —  SOFT DELETE, vendor only
// ─────────────────────────────────────────────────────────────────────────────
export const deleteVariant = async (
  userId: string,
  productId: string,
  variantId: string
) => {
  const vendor = await resolveVendor(userId);
  const product = await verifyOwnership(vendor.id, productId);

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId, deletedAt: null },
  });
  if (!variant) throw ApiError.notFound('Variant not found');

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { deletedAt: new Date(), isActive: false },
  });

  await invalidateProductCache(product.slug);
};

// ─────────────────────────────────────────────────────────────────────────────
// setProductImages  —  vendor only (PUT /products/:id/images, legacy route)
// Full replacement of all images for a product
// ─────────────────────────────────────────────────────────────────────────────
export const setProductImages = async (
  userId: string,
  productId: string,
  images: ProductImageInput[]
) => {
  const vendor = await resolveVendor(userId);
  const product = await verifyOwnership(vendor.id, productId);

  const normalizedImages = normalizeImages(images);

  await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId } });
    if (normalizedImages.length > 0) {
      await tx.productImage.createMany({
        data: normalizedImages.map((img) => ({ ...img, productId })),
      });
    }
  });

  await invalidateProductCache(product.slug);

  return prisma.productImage.findMany({
    where: { productId },
    select: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: ensure exactly one primary image
// ─────────────────────────────────────────────────────────────────────────────
const normalizeImages = (images: ProductImageInput[]): ProductImageInput[] => {
  if (images.length === 0) return images;

  const hasPrimary = images.some((img) => img.isPrimary);
  if (!hasPrimary) {
    return images.map((img, i) => ({ ...img, isPrimary: i === 0 }));
  }

  let foundFirst = false;
  return images.map((img) => {
    if (img.isPrimary && !foundFirst) { foundFirst = true; return img; }
    return { ...img, isPrimary: false };
  });
};

