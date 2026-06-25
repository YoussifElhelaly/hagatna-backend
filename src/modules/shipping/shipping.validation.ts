import { z } from 'zod';
import { ShipmentStatus } from '@prisma/client';

const localizedStringSchema = z.object({
  en: z.string().min(1, 'English value is required'),
  ar: z.string().min(1, 'Arabic value is required'),
});

const optionalLocalizedStringSchema = z
  .object({ en: z.string().min(1), ar: z.string().min(1) })
  .optional();

const isoCountryCode = z
  .string()
  .length(2, 'Must be a 2-letter ISO country code')
  .toUpperCase();

// ─── Shipping Zone ────────────────────────────────────────────────────────────
export const CreateZoneSchema = z.object({
  name: z.string().min(2).max(100),
  countries: z
    .array(isoCountryCode)
    .min(1, 'At least one country is required')
    .max(250),
  regions: z.array(z.string().min(1).max(100)).optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateZoneSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    countries: z.array(isoCountryCode).min(1).max(250).optional(),
    regions: z.array(z.string().min(1).max(100)).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ─── Shipping Method ──────────────────────────────────────────────────────────
export const CreateMethodSchema = z.object({
  zoneId: z.string().uuid('Invalid zone ID'),
  name: localizedStringSchema,
  minDays: z.number().int().min(0).optional().default(1),
  maxDays: z.number().int().min(1).optional().default(7),
  price: z.number().min(0),
  isFree: z.boolean().optional().default(false),
  minOrderForFree: z.number().positive().optional(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (d) => !d.maxDays || d.maxDays >= (d.minDays ?? 1),
  { message: 'maxDays must be >= minDays', path: ['maxDays'] }
);

export const UpdateMethodSchema = z
  .object({
    name: optionalLocalizedStringSchema,
    minDays: z.number().int().min(0).optional(),
    maxDays: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    isFree: z.boolean().optional(),
    minOrderForFree: z.number().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ─── Shipment ─────────────────────────────────────────────────────────────────
export const CreateShipmentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  shippingMethodId: z.string().uuid().optional(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(255).optional(),
  trackingUrl: z.string().url('Invalid tracking URL').optional(),
  estimatedDelivery: z.string().datetime({ offset: true }).optional(),
});

export const UpdateShipmentSchema = z
  .object({
    carrier: z.string().max(100).optional(),
    trackingNumber: z.string().max(255).optional(),
    trackingUrl: z.string().url('Invalid tracking URL').nullable().optional(),
    estimatedDelivery: z.string().datetime({ offset: true }).nullable().optional(),
    status: z.nativeEnum(ShipmentStatus).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ─── Params ───────────────────────────────────────────────────────────────────
export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});

export const OrderNumberParamSchema = z.object({
  orderNumber: z.string().min(1),
});

// ─── Available methods query ──────────────────────────────────────────────────
export const AvailableMethodsQuerySchema = z.object({
  country: isoCountryCode,
  orderSubtotal: z.coerce.number().positive().optional(),
});

// ─── Admin — list all shipments ───────────────────────────────────────────────
export const ListShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(ShipmentStatus).optional(),
  vendorId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
});
