/* CHAT_DISABLED — re-enable when rebuilding chat with new approach
import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { validate } from '@shared/middlewares/validate';
import {
  ListConversationsQuerySchema,
  ConversationMessagesQuerySchema,
  ConversationIdParamSchema,
} from './chat.validation';
import * as ChatController from './chat.controller';

const router = Router();

// All conversation routes require authentication
router.use(authenticate);

// POST /api/v1/conversations  — start or return existing conversation
// Body: { vendorId: string, orderId?: string }
router.post('/', ChatController.createConversation);

// GET /api/v1/conversations?page=1&limit=20
// - Admin: all conversations
// - Vendor: their own conversations
// - Customer: their own conversations
router.get(
  '/',
  validate({ query: ListConversationsQuerySchema }),
  ChatController.listConversations,
);

// GET /api/v1/conversations/:id/messages?page=1&limit=50
router.get(
  '/:id/messages',
  validate({ params: ConversationIdParamSchema, query: ConversationMessagesQuerySchema }),
  ChatController.getConversationMessages,
);

// POST /api/v1/conversations/:id/messages  — send a message
// Body: { content?: string, attachmentUrl?: string, attachmentType?: string }
router.post(
  '/:id/messages',
  validate({ params: ConversationIdParamSchema }),
  ChatController.sendMessage,
);

export default router;
*/
