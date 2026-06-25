import { LocalizedString } from '@shared/types';

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreateCategoryInput {
  name: LocalizedString;
  description?: LocalizedString;
  parentId?: string;
  image?: string;
  sortOrder?: number;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface UpdateCategoryInput {
  name?: LocalizedString;
  description?: LocalizedString;
  parentId?: string | null;  // null = move to top-level
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
}
