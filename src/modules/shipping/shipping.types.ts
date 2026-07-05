import { LocalizedString } from '@shared/types';

// ─── Shipping Zone ────────────────────────────────────────────────────────────
export interface CreateZoneInput {
  name: string;
  countries: string[];   // ISO 3166-1 alpha-2 codes e.g. ["AE", "SA", "EG"]
  regions?: string[];
  isActive?: boolean;
}

export interface UpdateZoneInput {
  name?: string;
  countries?: string[];
  regions?: string[];
  isActive?: boolean;
}

// ─── Shipping Class ───────────────────────────────────────────────────────────
export interface CreateShippingClassInput {
  name: LocalizedString;
  baseCost: number;
  extraUnitCost?: number;
  maxCost?: number;
  isActive?: boolean;
}

export interface UpdateShippingClassInput {
  name?: LocalizedString;
  baseCost?: number;
  extraUnitCost?: number;
  maxCost?: number | null;
  isActive?: boolean;
}

// ─── Shipping Method ──────────────────────────────────────────────────────────
export interface CreateMethodInput {
  zoneId: string;
  name: LocalizedString;
  minDays?: number;
  maxDays?: number;
  price: number;
  isFree?: boolean;
  minOrderForFree?: number;
  isActive?: boolean;
}

export interface UpdateMethodInput {
  name?: LocalizedString;
  minDays?: number;
  maxDays?: number;
  price?: number;
  isFree?: boolean;
  minOrderForFree?: number | null;
  isActive?: boolean;
}

// ─── Shipment ─────────────────────────────────────────────────────────────────
export interface CreateShipmentInput {
  orderId: string;
  shippingMethodId?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;   // ISO date string
}

export interface UpdateShipmentInput {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  status?: string;
}

// ─── Available methods query ──────────────────────────────────────────────────
export interface AvailableMethodsQuery {
  country: string;
  orderSubtotal?: number;
}
