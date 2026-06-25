import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as ContactService from './contact.service';
import type { ContactQueryParams } from './contact.types';

// ─── POST /contact ───────────────────────────────────────────────────
export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  await ContactService.submitContactMessage(req.body);
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Your message has been sent successfully. We will get back to you soon.',
  });
});

// ─── GET /admin/contact ──────────────────────────────────────────────
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const params: ContactQueryParams = {
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
    status: req.query.status as string | undefined,
    search: req.query.search as string | undefined,
  };
  const result = await ContactService.getContactMessages(params);
  sendSuccess({ res, message: 'Contact messages fetched', data: result });
});

// ─── GET /admin/contact/:id ──────────────────────────────────────────
export const getMessageById = asyncHandler(async (req: Request, res: Response) => {
  const message = await ContactService.getContactMessageById(req.params.id);
  sendSuccess({ res, message: 'Contact message fetched', data: message });
});

// ─── PATCH /admin/contact/:id/status ─────────────────────────────────
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const message = await ContactService.updateContactStatus(req.params.id, req.body.status);
  sendSuccess({ res, message: 'Status updated', data: message });
});

// ─── DELETE /admin/contact/:id ───────────────────────────────────────
export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  await ContactService.deleteContactMessage(req.params.id);
  sendSuccess({ res, message: 'Contact message deleted' });
});

// ─── GET /admin/contact/stats ────────────────────────────────────────
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await ContactService.getContactStats();
  sendSuccess({ res, message: 'Contact stats fetched', data: stats });
});
