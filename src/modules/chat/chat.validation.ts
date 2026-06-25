/* CHAT_DISABLED — re-enable when rebuilding chat with new approach
import { z } from 'zod';

export const ListConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const ConversationMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const ConversationIdParamSchema = z.object({
  id: z.string().uuid('Invalid conversation ID'),
});
*/
