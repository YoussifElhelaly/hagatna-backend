import { LocalizedString } from '@shared/types';

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreateVendorPlanInput {
  name: LocalizedString;
  description?: LocalizedString;
  maxProducts?: number;            // null / undefined = unlimited
  categoryIds: string[];           // must have at least 1
  isActive?: boolean;
  sortOrder?: number;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface UpdateVendorPlanInput {
  name?: LocalizedString;
  description?: LocalizedString;
  maxProducts?: number | null;     // null explicitly removes the limit
  categoryIds?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

// ─── List Query ───────────────────────────────────────────────────────────────
export interface VendorPlansListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
