import { Request, Response, NextFunction } from 'express';
import { Role, VendorStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { asyncHandler } from '@shared/utils/asyncHandler';

/**
 * Gate for vendor-selling endpoints (products, orders, shipments, promotions...).
 * `role === 'vendor'` is assigned at signup so an applicant can identify as a
 * vendor right away, but that alone must not unlock selling — admin approval
 * of the VendorProfile is the real gate, checked here on every request.
 * Always use after `authenticate`. Pass extra roles (e.g. Role.admin) that
 * should bypass the vendor/approval check entirely.
 *
 * @example
 * router.post('/products', authenticate, requireApprovedVendor(), createProduct);
 * router.delete('/products/:id', authenticate, requireApprovedVendor(Role.admin), deleteProduct);
 */
export const requireApprovedVendor = (...bypassRoles: Role[]) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();

    if (bypassRoles.includes(req.user.role)) {
      next();
      return;
    }

    if (req.user.role !== Role.vendor) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
      select: { status: true },
    });

    if (!vendor || vendor.status !== VendorStatus.approved) {
      throw ApiError.forbidden('Your vendor account is not approved yet');
    }

    next();
  });
};
