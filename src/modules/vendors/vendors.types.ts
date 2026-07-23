import { VendorStatus } from '@prisma/client';
import { LocalizedString } from '@shared/types';

// ─── Onboarding ───────────────────────────────────────────────────────────────
export interface OnboardVendorInput {
  planId: string;
  storeName: LocalizedString;
  description?: LocalizedString;
  address?: string;
  city?: string;
  country?: string;
  phone: string;
  secondaryPhone?: string;
  taxCardNumber: string;
  commercialRegistrationNumber: string;
}

// ─── Profile Update ───────────────────────────────────────────────────────────
export interface UpdateVendorProfileInput {
  storeName?: LocalizedString;
  description?: LocalizedString;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  secondaryPhone?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  taxCardNumber?: string;
  commercialRegistrationNumber?: string;
}

// ─── Admin Actions ────────────────────────────────────────────────────────────
export interface RejectVendorInput {
  rejectionReason: string;
}

export interface UpdateCommissionInput {
  commissionRate: number;
}

// ─── List Query ───────────────────────────────────────────────────────────────
export interface VendorsListQuery {
  page?: number;
  limit?: number;
  status?: VendorStatus;
  search?: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface VendorStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  pendingCommission: number;
  totalReviews: number;
  averageRating: number;
}
