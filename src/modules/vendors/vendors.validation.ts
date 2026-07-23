import { z } from 'zod';
import { VendorStatus } from '@prisma/client';

// Reusable bilingual string schema
const localizedStringSchema = z.object({
  en: z.string().min(1, 'English value is required'),
  ar: z.string().min(1, 'Arabic value is required'),
});

const optionalLocalizedStringSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1),
}).optional();

const phoneSchema = z.string().regex(/^(?:\+20|0)?1[0125]\d{8}$/, 'Invalid Egyptian phone number');

// ─── Onboarding ───────────────────────────────────────────────────────────────
export const OnboardVendorSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  storeName: localizedStringSchema.refine(
    (v) => v.en.length >= 2 && v.en.length <= 100,
    { message: 'Store name must be between 2 and 100 characters' }
  ),
  description: optionalLocalizedStringSchema,
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').toUpperCase().optional(),
  phone: phoneSchema,
  secondaryPhone: phoneSchema.optional(),
  taxCardNumber: z.string().min(1).max(50),
  commercialRegistrationNumber: z.string().min(1).max(100),
});

// ─── Profile Update ───────────────────────────────────────────────────────────
export const UpdateVendorProfileSchema = z.object({
  storeName: optionalLocalizedStringSchema,
  description: optionalLocalizedStringSchema,
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  phone: phoneSchema.optional(),
  secondaryPhone: phoneSchema.nullish(),
  taxCardNumber: z.string().min(1).max(50).optional(),
  commercialRegistrationNumber: z.string().min(1).max(100).optional(),
  website: z.string().url().max(255).nullish(),
  instagramUrl: z.string().url().max(255).nullish(),
  facebookUrl: z.string().url().max(255).nullish(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ─── Admin Actions ────────────────────────────────────────────────────────────
export const RejectVendorSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500),
});

export const UpdateCommissionSchema = z.object({
  commissionRate: z
    .number()
    .min(0, 'Commission rate cannot be negative')
    .max(50, 'Commission rate cannot exceed 50%'),
});

// ─── Params & Queries ─────────────────────────────────────────────────────────
export const VendorIdParamSchema = z.object({
  id: z.string().uuid('Invalid vendor ID'),
});

export const VendorSlugParamSchema = z.object({
  slug: z.string().min(1),
});

export const VendorsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(VendorStatus).optional(),
  search: z.string().max(100).optional(),
});
