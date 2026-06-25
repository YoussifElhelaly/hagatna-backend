import { ReviewStatus } from '@prisma/client';

// ─── Media ────────────────────────────────────────────────────────────────────
export interface ReviewMediaInput {
  url: string;
  type: 'image' | 'video';
}

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreateReviewInput {
  productId: string;
  orderId?: string;       // if provided → marks isVerifiedPurchase automatically
  rating: number;         // 1-5
  title?: string;
  content?: string;
  media?: ReviewMediaInput[];
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
}

// ─── List queries ─────────────────────────────────────────────────────────────
export interface ProductReviewsQuery {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  rating?: number;      // filter by exact star rating
}

export interface AdminReviewsQuery {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  productId?: string;
  vendorId?: string;
}
