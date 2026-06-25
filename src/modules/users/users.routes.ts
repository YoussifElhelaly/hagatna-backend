import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  CreateAddressSchema,
  UpdateAddressSchema,
  AddressIdParamSchema,
  UpdateUserStatusSchema,
  BulkUpdateStatusSchema,
  UserIdParamSchema,
  UsersListQuerySchema,
} from './users.validation';
import * as UsersController from './users.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── My Profile ───────────────────────────────────────────────────────────────

// GET    /api/v1/users/me
router.get('/me', UsersController.getMe);

// PATCH  /api/v1/users/me
router.patch(
  '/me',
  validate({ body: UpdateProfileSchema }),
  UsersController.updateMe
);

// PATCH  /api/v1/users/me/password
router.patch(
  '/me/password',
  validate({ body: ChangePasswordSchema }),
  UsersController.changePassword
);

// ─── My Addresses ─────────────────────────────────────────────────────────────

// GET    /api/v1/users/me/addresses
router.get('/me/addresses', UsersController.getAddresses);

// POST   /api/v1/users/me/addresses
router.post(
  '/me/addresses',
  validate({ body: CreateAddressSchema }),
  UsersController.createAddress
);

// PATCH  /api/v1/users/me/addresses/:id
router.patch(
  '/me/addresses/:id',
  validate({ params: AddressIdParamSchema, body: UpdateAddressSchema }),
  UsersController.updateAddress
);

// DELETE /api/v1/users/me/addresses/:id
router.delete(
  '/me/addresses/:id',
  validate({ params: AddressIdParamSchema }),
  UsersController.deleteAddress
);

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET    /api/v1/users
router.get(
  '/',
  authorize(ROLES.ADMIN),
  validate({ query: UsersListQuerySchema }),
  UsersController.listUsers
);

// PATCH  /api/v1/users/bulk/status  (must come before /:id)
router.patch(
  '/bulk/status',
  authorize(ROLES.ADMIN),
  validate({ body: BulkUpdateStatusSchema }),
  UsersController.bulkUpdateStatus
);

// GET    /api/v1/users/:id
router.get(
  '/:id',
  authorize(ROLES.ADMIN),
  validate({ params: UserIdParamSchema }),
  UsersController.getUserById
);

// PATCH  /api/v1/users/:id/status
router.patch(
  '/:id/status',
  authorize(ROLES.ADMIN),
  validate({ params: UserIdParamSchema, body: UpdateUserStatusSchema }),
  UsersController.updateUserStatus
);

export default router;
