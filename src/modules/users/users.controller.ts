import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as UsersService from './users.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── GET /users/me ────────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.getMe(req.user!.id);
  sendSuccess({ res, message: 'Profile retrieved', data: user });
});

// ─── PATCH /users/me ──────────────────────────────────────────────────────────
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.updateMe(req.user!.id, req.body);
  sendSuccess({ res, message: 'Profile updated successfully', data: user });
});

// ─── PATCH /users/me/password ─────────────────────────────────────────────────
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await UsersService.changePassword(req.user!.id, req.body);
  sendSuccess({ res, message: 'Password changed successfully' });
});

// ─── GET /users/me/addresses ──────────────────────────────────────────────────
export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await UsersService.getAddresses(req.user!.id);
  sendSuccess({ res, message: 'Addresses retrieved', data: addresses });
});

// ─── POST /users/me/addresses ─────────────────────────────────────────────────
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await UsersService.createAddress(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Address added successfully', data: address });
});

// ─── PATCH /users/me/addresses/:id ───────────────────────────────────────────
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await UsersService.updateAddress(req.user!.id, req.params.id, req.body);
  sendSuccess({ res, message: 'Address updated successfully', data: address });
});

// ─── DELETE /users/me/addresses/:id ──────────────────────────────────────────
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await UsersService.deleteAddress(req.user!.id, req.params.id);
  sendSuccess({ res, message: 'Address deleted successfully' });
});

// ─── GET /users  (admin) ──────────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { users, meta } = await UsersService.listUsers(req.query as never);
  sendSuccess({ res, message: 'Users retrieved', data: users, meta });
});

// ─── GET /users/:id  (admin) ──────────────────────────────────────────────────
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.getUserById(req.params.id);
  sendSuccess({ res, message: 'User retrieved', data: user });
});

// ─── PATCH /users/:id/status  (admin) ─────────────────────────────────────────
export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.updateUserStatus(req.params.id, req.body.isActive);
  const action = req.body.isActive ? 'activate_user' : 'suspend_user';
  logActivity({ userId: req.user!.id, role: 'admin', category: 'system', action, entityType: 'user', entityId: req.params.id, entityLabel: user.name, ipAddress: req.ip, userAgent: req.get('user-agent') });
  sendSuccess({ res, message: `User ${req.body.isActive ? 'activated' : 'suspended'} successfully`, data: user });
});

// ─── PATCH /users/bulk/status  (admin) ────────────────────────────────────────
export const bulkUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await UsersService.bulkUpdateStatus(req.body.ids, req.body.isActive);
  const action = req.body.isActive ? 'bulk_activate_users' : 'bulk_suspend_users';
  logActivity({ userId: req.user!.id, role: 'admin', category: 'system', action, entityType: 'user', metadata: { count: result.updated, userIds: req.body.ids }, ipAddress: req.ip, userAgent: req.get('user-agent') });
  sendSuccess({ res, message: `${result.updated} user(s) ${req.body.isActive ? 'activated' : 'suspended'} successfully`, data: result });
});
