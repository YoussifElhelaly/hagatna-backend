import { prisma } from '@database/prisma/client';
import { comparePassword, hashPassword } from '@shared/utils/hashPassword';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  CreateAddressInput,
  UpdateAddressInput,
  UsersListQuery,
  UserProfile,
} from './users.types';

// ─────────────────────────────────────────────────────────────────────────────
// getMe
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (userId: string): Promise<UserProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatar: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) throw ApiError.notFound('User not found');
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateMe
// ─────────────────────────────────────────────────────────────────────────────
export const updateMe = async (userId: string, input: UpdateProfileInput): Promise<UserProfile> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatar: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// changePassword
// ─────────────────────────────────────────────────────────────────────────────
export const changePassword = async (
  userId: string,
  input: ChangePasswordInput
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, provider: true },
  });

  if (!user) throw ApiError.notFound('User not found');

  // OAuth-only accounts have no password
  if (!user.passwordHash) {
    throw ApiError.badRequest('This account uses social login and has no password to change');
  }

  const isMatch = await comparePassword(input.currentPassword, user.passwordHash);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      refreshToken: null, // invalidate all sessions
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Addresses
// ─────────────────────────────────────────────────────────────────────────────
export const getAddresses = async (userId: string) => {
  return prisma.address.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
};

export const createAddress = async (userId: string, input: CreateAddressInput) => {
  // If new address is default, unset existing default first
  if (input.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  // If this is the first address, make it default automatically
  const count = await prisma.address.count({ where: { userId, deletedAt: null } });
  const isDefault = input.isDefault ?? count === 0;

  return prisma.address.create({
    data: { ...input, userId, isDefault },
  });
};

export const updateAddress = async (
  userId: string,
  addressId: string,
  input: UpdateAddressInput
) => {
  // Verify ownership
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId, deletedAt: null },
  });
  if (!address) throw ApiError.notFound('Address not found');

  // If setting as default, unset others
  if (input.isDefault === true) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: addressId }, deletedAt: null },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data: input,
  });
};

export const deleteAddress = async (userId: string, addressId: string): Promise<void> => {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId, deletedAt: null },
  });
  if (!address) throw ApiError.notFound('Address not found');

  await prisma.address.update({
    where: { id: addressId },
    data: { deletedAt: new Date() },
  });

  // If deleted address was default, promote the next one
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { id: 'asc' },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — list users
// ─────────────────────────────────────────────────────────────────────────────
export const listUsers = async (query: UsersListQuery) => {
  const { page = 1, limit = 20, role, search, isActive, isVerified } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(isVerified !== undefined && { isVerified }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        provider: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — get user by ID
// ─────────────────────────────────────────────────────────────────────────────
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatar: true,
      isVerified: true,
      isActive: true,
      provider: true,
      createdAt: true,
      updatedAt: true,
      addresses: true,
      vendorProfile: {
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          status: true,
          commissionRate: true,
        },
      },
      _count: {
        select: { orders: true, reviews: true },
      },
    },
  });

  if (!user) throw ApiError.notFound('User not found');
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — update user status (suspend / activate)
// ─────────────────────────────────────────────────────────────────────────────
export const updateUserStatus = async (id: string, isActive: boolean) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');

  return prisma.user.update({
    where: { id },
    data: {
      isActive,
      // If suspending, invalidate all sessions
      ...(!isActive && { refreshToken: null }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — bulk update user status
// ─────────────────────────────────────────────────────────────────────────────
export const bulkUpdateStatus = async (ids: string[], isActive: boolean) => {
  const result = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: {
      isActive,
      ...(!isActive && { refreshToken: null }),
    },
  });

  return { updated: result.count };
};
