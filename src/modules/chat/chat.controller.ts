/* CHAT_DISABLED — re-enable when rebuilding chat with new approach
import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as ChatService from './chat.service';

// ─── GET /conversations  (admin sees all; vendor/customer sees own) ────────────
export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const { conversations, meta } = await ChatService.listConversations(
    req.user!.id,
    isAdmin,
    req.query as never
  );
  sendSuccess({ res, message: 'Conversations retrieved', data: conversations, meta });
});

// ─── GET /conversations/:id/messages ─────────────────────────────────────────
export const getConversationMessages = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const { messages, meta } = await ChatService.getConversationMessages(
    req.user!.id,
    req.params.id,
    isAdmin,
    req.query as never
  );
  sendSuccess({ res, message: 'Messages retrieved', data: messages, meta });
});

// ─── POST /conversations  (customer or vendor starts a conversation) ──────────
export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const { vendorId, orderId } = req.body;
  const conversation = await ChatService.createOrGetConversation(
    req.user!.id,
    vendorId,
    orderId,
  );
  sendCreated(res, 'Conversation ready', conversation);
});

// ─── POST /conversations/:id/messages  (send a message) ──────────────────────
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { content, attachmentUrl, attachmentType } = req.body;
  const message = await ChatService.sendMessageHttp(
    req.user!.id,
    req.params.id,
    content,
    attachmentUrl,
    attachmentType,
  );
  sendCreated(res, 'Message sent', message);
});
*/
