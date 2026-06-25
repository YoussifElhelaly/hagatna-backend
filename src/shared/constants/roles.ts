import { Role } from '@prisma/client';

export const ROLES = {
  ADMIN: Role.admin,
  VENDOR: Role.vendor,
  CUSTOMER: Role.customer,
} as const;

export const ALL_ROLES = [Role.admin, Role.vendor, Role.customer];
export const VENDOR_AND_ADMIN = [Role.vendor, Role.admin];
export const CUSTOMER_AND_ADMIN = [Role.customer, Role.admin];
