import { PromotionType, DiscountType } from '@prisma/client';
import { LocalizedString } from '@shared/types';

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreatePromotionInput {
  name: LocalizedString;
  type: PromotionType;
  code?: string;                  // required for coupon type
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;     // cap for percentage discounts
  usageLimitTotal?: number;       // null = unlimited
  usageLimitPerUser?: number;
  startsAt: string;               // ISO datetime string
  endsAt?: string;
  isActive?: boolean;
  vendorId?: string;              // null = platform-wide (admin only)
  categoryIds?: string[];         // empty = applies to all categories
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface UpdatePromotionInput {
  name?: LocalizedString;
  discountValue?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimitTotal?: number | null;
  usageLimitPerUser?: number;
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
  categoryIds?: string[];         // empty = applies to all categories
}

// ─── List query ───────────────────────────────────────────────────────────────
export interface PromotionsListQuery {
  page?: number;
  limit?: number;
  type?: PromotionType;
  isActive?: boolean;
  vendorId?: string;
  search?: string;    // search by code or name
}

// ─── Validate coupon ──────────────────────────────────────────────────────────
export interface ValidateCouponQuery {
  code: string;
  subtotal?: number;
}
