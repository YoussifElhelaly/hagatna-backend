import { z } from 'zod';
import { Role } from '@prisma/client';
import { imageUrlSchema } from '@shared/validation/imageUrl';
import { isGovernorateCode } from '@shared/constants/governorates';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

// ─── Profile ──────────────────────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^(?:\+20|0)?1[0125]\d{8}$/, 'Invalid Egyptian phone number')
    .optional(),
  avatar: imageUrlSchema('Invalid avatar URL').optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// ─── Address ──────────────────────────────────────────────────────────────────
export const CreateAddressSchema = z.object({
  label: z.string().max(50).optional(),
  recipientName: z.string().min(2).max(100),
  phone: z.string().regex(/^(?:\+20|0)?1[0125]\d{8}$/, 'Invalid Egyptian phone number'),
  street: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  governorate: z.string().refine(isGovernorateCode, 'Unknown Egyptian governorate'),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').toUpperCase(),
  zipCode: z.string().max(20).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

export const AddressIdParamSchema = z.object({
  id: z.string().uuid('Invalid address ID'),
});

// ─── Admin ────────────────────────────────────────────────────────────────────
export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const UserIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

export const UsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.nativeEnum(Role).optional(),
  search: z.string().max(100).optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isVerified: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

// ─── Bulk status update ───────────────────────────────────────────────────────
export const BulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one ID is required').max(100),
  isActive: z.boolean(),
});
