import { ProductStatus } from '@prisma/client';
import { LocalizedString } from '@shared/types';

// ─── Variants ─────────────────────────────────────────────────────────────────
export interface ProductVariantInput {
  name: string;
  options: Record<string, string>;   // e.g. { color: 'red', size: 'L' }
  price: number;
  comparePrice?: number;
  sku?: string;
  stockQuantity?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  options?: Record<string, string>;
  price?: number;
  comparePrice?: number;
  sku?: string;
  stockQuantity?: number;
  imageUrl?: string;
  isActive?: boolean;
}

// ─── Images ───────────────────────────────────────────────────────────────────
export interface ProductImageInput {
  url: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreateProductInput {
  categoryId: string;
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  dealEndsAt?: Date | null;
  brandId?: string | null;
  shippingClassId?: string;
  sku?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  variants?: ProductVariantInput[];
  images?: ProductImageInput[];
  tags?: string[];
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface UpdateProductInput {
  categoryId?: string;
  name?: LocalizedString;
  description?: LocalizedString;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  dealEndsAt?: Date | null;
  brandId?: string | null;
  shippingClassId?: string | null;
  sku?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  tags?: string[];    // full replacement of all tags
  images?: ProductImageInput[];  // full replacement of all images (admin only)
}

// ─── Status Update ────────────────────────────────────────────────────────────
export interface UpdateProductStatusInput {
  status: ProductStatus;
}

// ─── List Queries ─────────────────────────────────────────────────────────────
export interface ProductsListQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  vendorId?: string;
  vendorSlug?: string;
  brand?: string;      // brand slug or id
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tag?: string;
  isFeatured?: boolean;
  onSale?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  // Dynamic attribute filters e.g. { ram: "8GB", color: "Black" }
  attrs?: Record<string, string>;
}

export interface VendorProductsListQuery {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  search?: string;
}

export interface AdminListProductsQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  search?: string;
}
