import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '@shared/utils/ApiError';

/**
 * RBAC middleware. Pass allowed roles — request is rejected if user's role is not in the list.
 * Always use after `authenticate`.
 *
 * @example
 * router.post('/products', authenticate, authorize(Role.vendor, Role.admin), createProduct);
 */
export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }

    next();
  };
};
