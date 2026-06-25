/* CHAT_DISABLED — re-enable when rebuilding chat with new approach
import { Socket } from 'socket.io';
import { logger } from '@shared/utils/logger';
import { JwtPayload } from '@shared/types';
import { prisma } from '@database/prisma/client';
import {
  sendMessage,
  getConversationParticipants,
  markMessagesRead,
} from '@modules/chat/chat.service';
import { getIO } from './index';

// ─── Typed socket ─────────────────────────────────────────────────────────────
type AuthSocket = Socket & { user: JwtPayload };

// ─── Event payload types ──────────────────────────────────────────────────────
interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  content?: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface TypingPayload {
  conversationId: string;
}

interface MessageReadPayload {
  conversationId: string;
}

// ─── Room name helper ─────────────────────────────────────────────────────────
const conversationRoom = (id: string) => `conversation:${id}`;

// ─────────────────────────────────────────────────────────────────────────────
// Verify the socket user is a participant of the conversation.
// Returns true if allowed, false if not (and emits an error to the socket).
// ─────────────────────────────────────────────────────────────────────────────
async function assertParticipant(socket: AuthSocket, conversationId: string): Promise<boolean> {
  const participants = await getConversationParticipants(conversationId);
  if (!participants) {
    socket.emit('error', { message: 'Conversation not found' });
    return false;
  }

  const { customerId, vendorUserId } = participants;
  const userId = socket.user.id;
  const role = socket.user.role;

  if (role === 'admin' || userId === customerId || userId === vendorUserId) {
    return true;
  }

  socket.emit('error', { message: 'Access denied to this conversation' });
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// registerChatEvents  —  called once per socket connection
// ─────────────────────────────────────────────────────────────────────────────
export const registerChatEvents = (socket: AuthSocket): void => {
  const userId = socket.user.id;

  // ── join_conversation ──────────────────────────────────────────────────────
  // Client emits when opening a chat thread. Joins the socket.io room so it
  // receives real-time new_message / typing events for this conversation.
  socket.on('join_conversation', async ({ conversationId }: JoinConversationPayload) => {
    try {
      if (!conversationId) { socket.emit('error', { message: 'conversationId required' }); return; }

      const allowed = await assertParticipant(socket, conversationId);
      if (!allowed) return;

      await socket.join(conversationRoom(conversationId));

      // Mark unread messages as read upon joining
      const readCount = await markMessagesRead(conversationId, userId);
      if (readCount > 0) {
        // Notify the sender(s) that their messages were read
        socket.to(conversationRoom(conversationId)).emit('messages_read', {
          conversationId,
          readerId: userId,
        });
      }

      socket.emit('conversation_joined', { conversationId });
      logger.debug(`User ${userId} joined conversation room ${conversationId}`);
    } catch (err) {
      logger.error('join_conversation error:', err);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // ── leave_conversation ─────────────────────────────────────────────────────
  // Client emits when navigating away from the chat thread.
  socket.on('leave_conversation', ({ conversationId }: JoinConversationPayload) => {
    socket.leave(conversationRoom(conversationId));
    logger.debug(`User ${userId} left conversation room ${conversationId}`);
  });

  // ── send_message ───────────────────────────────────────────────────────────
  // Client emits to send a new message. The server persists it to DB and
  // broadcasts new_message to everyone in the conversation room.
  socket.on('send_message', async (payload: SendMessagePayload) => {
    try {
      const { conversationId, content, attachmentUrl, attachmentType } = payload;

      if (!conversationId) { socket.emit('error', { message: 'conversationId required' }); return; }
      if (!content && !attachmentUrl) {
        socket.emit('error', { message: 'Message must have content or an attachment' });
        return;
      }

      const allowed = await assertParticipant(socket, conversationId);
      if (!allowed) return;

      // Persist to DB
      const message = await sendMessage(userId, conversationId, content, attachmentUrl, attachmentType);

      // Broadcast to all sockets in the conversation room (including sender)
      getIO().to(conversationRoom(conversationId)).emit('new_message', {
        conversationId,
        message,
      });

      // If the other participant is NOT in the conversation room yet,
      // send them a targeted notification to their personal room
      const participants = await getConversationParticipants(conversationId);
      if (participants) {
        const otherId =
          participants.customerId === userId
            ? participants.vendorUserId
            : participants.customerId;

        // Check if the other user has this conversation room open
        const roomSockets = await getIO()
          .in(conversationRoom(conversationId))
          .fetchSockets();
        const otherIsInRoom = roomSockets.some(
          (s) => (s as unknown as AuthSocket).user?.id === otherId
        );

        if (!otherIsInRoom) {
          // Push a lightweight nudge to their personal notification room
          getIO().to(`user:${otherId}`).emit('new_message_notification', {
            conversationId,
            senderId: userId,
            preview: content ? content.substring(0, 80) : '📎 Attachment',
          });
        }
      }
    } catch (err) {
      logger.error('send_message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── typing_start ───────────────────────────────────────────────────────────
  // Broadcast to others in the conversation that the user started typing.
  socket.on('typing_start', ({ conversationId }: TypingPayload) => {
    socket.to(conversationRoom(conversationId)).emit('typing', {
      conversationId,
      userId,
    });
  });

  // ── typing_stop ────────────────────────────────────────────────────────────
  socket.on('typing_stop', ({ conversationId }: TypingPayload) => {
    socket.to(conversationRoom(conversationId)).emit('stop_typing', {
      conversationId,
      userId,
    });
  });

  // ── message_read ───────────────────────────────────────────────────────────
  // Client emits after scrolling through messages to mark them as read.
  socket.on('message_read', async ({ conversationId }: MessageReadPayload) => {
    try {
      if (!conversationId) return;

      const readCount = await markMessagesRead(conversationId, userId);
      if (readCount > 0) {
        socket.to(conversationRoom(conversationId)).emit('messages_read', {
          conversationId,
          readerId: userId,
          count: readCount,
        });
      }
    } catch (err) {
      logger.error('message_read error:', err);
    }
  });
};
*/
