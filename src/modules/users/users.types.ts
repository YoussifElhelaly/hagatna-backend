import { Role } from '@prisma/client';

// ─── Profile ──────────────────────────────────────────────────────────────────
export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// ─── Address ──────────────────────────────────────────────────────────────────
export interface CreateAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  zipCode?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> {}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface UpdateUserStatusInput {
  isActive: boolean;
}

export interface UsersListQuery {
  page?: number;
  limit?: number;
  role?: Role;
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

// ─── Response Shapes ──────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}
