import { ReviewStatus, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type {
  CreateReviewInput,
  UpdateReviewInput,
  ProductReviewsQuery,
  AdminReviewsQuery,
} from './reviews.types';

// ─── Shared select ────────────────────────────────────────────────────────────
const reviewSelect = {
  id: true,
  rating: true,
  title: true,
  content: true,
  authorName: true,
  status: true,
  isVerifiedPurchase: true,
  helpfulCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, avatar: true } },
  media: { select: { id: true, url: true, type: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// getProductReviews  —  public, approved reviews only
// ─────────────────────────────────────────────────────────────────────────────
export const getProductReviews = async (productSlug: string, query: ProductReviewsQuery) => {
  const product = await prisma.product.findFirst({
    where: { slug: productSlug, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const { page = 1, limit = 10, sort = 'newest', rating } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = {
    productId: product.id,
    status: ReviewStatus.approved,
    deletedAt: null,
    ...(rating && { rating }),
  };

  const orderBy: Prisma.ReviewOrderByWithRelationInput =
    sort === 'oldest'  ? { createdAt: 'asc' }
    : sort === 'highest' ? { rating: 'desc' }
    : sort === 'lowest'  ? { rating: 'asc' }
    : sort === 'helpful' ? { helpfulCount: 'desc' }
    : { createdAt: 'desc' };

  const [reviews, total, ratingAgg] = await Promise.all([
    prisma.review.findMany({ where, skip, take: limit, orderBy, select: reviewSelect }),
    prisma.review.count({ where }),
    // rating distribution
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId: product.id, status: ReviewStatus.approved, deletedAt: null },
      _count: { rating: true },
    }),
  ]);

  // Build distribution map { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRatingSum = 0;
  let totalRatingCount = 0;
  for (const row of ratingAgg) {
    distribution[row.rating] = row._count.rating;
    totalRatingSum += row.rating * row._count.rating;
    totalRatingCount += row._count.rating;
  }
  const averageRating =
    totalRatingCount > 0
      ? Number((totalRatingSum / totalRatingCount).toFixed(1))
      : 0;

  return {
    reviews,
    stats: { averageRating, totalReviews: totalRatingCount, distribution },
    meta: buildPaginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// createReview  —  customer, one review per product per order
// ─────────────────────────────────────────────────────────────────────────────
export const createReview = async (userId: string, input: CreateReviewInput) => {
  const { productId, orderId, rating, title, content, media = [] } = input;

  // Confirm product exists and is active
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, vendorId: true, status: true },
  });
  if (!product || product.status !== 'active') throw ApiError.notFound('Product not found');

  // Duplicate check — @@unique([userId, productId, orderId]), exclude soft-deleted
  const existing = await prisma.review.findFirst({
    where: { userId, productId, orderId: orderId ?? null, deletedAt: null },
  });
  if (existing) throw ApiError.conflict('You have already reviewed this product');

  // Verified purchase: check the user actually bought this product in the given order
  let isVerifiedPurchase = false;
  if (orderId) {
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        orderId,
        productId,
        order: { userId },
      },
    });
    if (!orderItem) {
      throw ApiError.badRequest('This order does not contain this product');
    }
    isVerifiedPurchase = true;
  }

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      vendorId: product.vendorId,
      orderId: orderId ?? null,
      rating,
      title,
      content,
      isVerifiedPurchase,
      media: media.length > 0 ? { create: media } : undefined,
    },
    select: reviewSelect,
  });

  return review;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateReview  —  customer updates their own (only pending or approved)
// ─────────────────────────────────────────────────────────────────────────────
export const updateReview = async (
  userId: string,
  reviewId: string,
  input: UpdateReviewInput
) => {
  const review = await prisma.review.findFirst({ where: { id: reviewId, deletedAt: null } });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.userId !== userId) throw ApiError.forbidden('Access denied');
  if (review.status === ReviewStatus.rejected) {
    throw ApiError.conflict('Rejected reviews cannot be edited');
  }

  // Editing resets status to pending for re-moderation
  return prisma.review.update({
    where: { id: reviewId },
    data: { ...input, status: ReviewStatus.pending },
    select: reviewSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteReview  —  customer deletes own, or admin deletes any
// ─────────────────────────────────────────────────────────────────────────────
export const deleteReview = async (
  userId: string,
  reviewId: string,
  isAdmin: boolean
) => {
  const review = await prisma.review.findFirst({ where: { id: reviewId, deletedAt: null } });
  if (!review) throw ApiError.notFound('Review not found');
  if (!isAdmin && review.userId !== userId) throw ApiError.forbidden('Access denied');

  await prisma.review.update({
    where: { id: reviewId },
    data: { deletedAt: new Date() },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// markHelpful  —  customer increments helpful count (one-time, no tracking here)
// ─────────────────────────────────────────────────────────────────────────────
export const markHelpful = async (reviewId: string) => {
  const review = await prisma.review.findFirst({ where: { id: reviewId, deletedAt: null } });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.status !== ReviewStatus.approved) {
    throw ApiError.badRequest('Can only mark approved reviews as helpful');
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
    select: { id: true, helpfulCount: true },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — listReviews
// ─────────────────────────────────────────────────────────────────────────────
export const listReviews = async (query: AdminReviewsQuery) => {
  const { page = 1, limit = 20, status, productId, vendorId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = {
    deletedAt: null,
    ...(status && { status }),
    ...(productId && { productId }),
    ...(vendorId && { vendorId }),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...reviewSelect,
        productId: true,
        vendorId: true,
        orderId: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — approveReview
// ─────────────────────────────────────────────────────────────────────────────
export const approveReview = async (reviewId: string) => {
  const review = await prisma.review.findFirst({ where: { id: reviewId, deletedAt: null } });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.status === ReviewStatus.approved) {
    throw ApiError.conflict('Review is already approved');
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.approved },
    select: reviewSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — rejectReview
// ─────────────────────────────────────────────────────────────────────────────
export const rejectReview = async (reviewId: string) => {
  const review = await prisma.review.findFirst({ where: { id: reviewId, deletedAt: null } });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.status === ReviewStatus.rejected) {
    throw ApiError.conflict('Review is already rejected');
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.rejected },
    select: reviewSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — adminCreateReview
// Author a review/testimonial directly (no linked user). Auto-approved so it
// shows on the storefront immediately. vendorId is derived from the product.
// ─────────────────────────────────────────────────────────────────────────────
export const adminCreateReview = async (input: {
  productId: string;
  rating: number;
  authorName: string;
  title?: string;
  content?: string;
}) => {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, deletedAt: null },
    select: { id: true, vendorId: true, status: true },
  });
  if (!product) throw ApiError.notFound('Product not found');

  return prisma.review.create({
    data: {
      userId: null,
      authorName: input.authorName,
      productId: product.id,
      vendorId: product.vendorId,
      rating: input.rating,
      title: input.title,
      content: input.content,
      status: ReviewStatus.approved,
      isVerifiedPurchase: false,
    },
    select: reviewSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor — getVendorReviews
// Paginated reviews for all products owned by this vendor
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorReviews = async (
  userId: string,
  query: { page?: number; limit?: number; productId?: string; rating?: number; status?: ReviewStatus }
) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');

  const { page = 1, limit = 20, productId, rating, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = {
    deletedAt: null,
    vendorId:  vendor.id,
    ...(productId && { productId }),
    ...(rating    && { rating }),
    ...(status    && { status }),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        ...reviewSelect,
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, meta: buildPaginationMeta(total, page, limit) };
};
