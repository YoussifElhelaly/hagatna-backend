/* CHAT_DISABLED — re-enable when rebuilding chat with new approach
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';

// ─── Shared selects ───────────────────────────────────────────────────────────
const conversationSelect = {
  id: true,
  lastMessageAt: true,
  createdAt: true,
  customer: { select: { id: true, name: true, avatar: true } },
  vendor: { select: { id: true, storeName: true, storeSlug: true, logo: true } },
  order: { select: { id: true, orderNumber: true } },
  _count: { select: { messages: { where: { isRead: false } } } },
};

const messageSelect = {
  id: true,
  content: true,
  attachmentUrl: true,
  attachmentType: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  sender: { select: { id: true, name: true, avatar: true, role: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// listConversations  —  admin sees all, customer/vendor sees their own
// ─────────────────────────────────────────────────────────────────────────────
export const listConversations = async (
  userId: string,
  isAdmin: boolean,
  query: { page?: number; limit?: number }
) => {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  let where = {};
  if (!isAdmin) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (vendor) {
      where = { vendorId: vendor.id };
    } else {
      where = { customerId: userId };
    }
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      select: conversationSelect,
    }),
    prisma.conversation.count({ where }),
  ]);

  return { conversations, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// getConversationMessages  —  paginated messages in a conversation
// ─────────────────────────────────────────────────────────────────────────────
export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  isAdmin: boolean,
  query: { page?: number; limit?: number }
) => {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, customerId: true, vendorId: true },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  if (!isAdmin) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    const isCustomer = conversation.customerId === userId;
    const isVendor = vendor?.id === conversation.vendorId;
    if (!isCustomer && !isVendor) throw ApiError.forbidden('Access denied');
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  await prisma.message.updateMany({
    where: {
      conversationId,
      isRead: false,
      senderId: { not: userId },
    },
    data: { isRead: true, readAt: new Date() },
  });

  return { messages, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// createOrGetConversation  —  start a new conversation or return existing one
// ─────────────────────────────────────────────────────────────────────────────
export const createOrGetConversation = async (
  initiatorId: string,
  vendorId: string,
  orderId?: string,
) => {
  const vendorProfile = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendorProfile) throw ApiError.notFound('Vendor not found');

  const existing = await prisma.conversation.findFirst({
    where: {
      customerId: initiatorId,
      vendorId,
      ...(orderId ? { orderId } : {}),
    },
    select: conversationSelect,
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      customerId: initiatorId,
      vendorId,
      orderId:   orderId ?? null,
      lastMessageAt: new Date(),
    },
    select: conversationSelect,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// sendMessage  —  persist a message and update conversation.lastMessageAt
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (
  senderId: string,
  conversationId: string,
  content?: string,
  attachmentUrl?: string,
  attachmentType?: string
) => {
  if (!content && !attachmentUrl) {
    throw new Error('Message must have content or an attachment');
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content ?? null,
        attachmentUrl: attachmentUrl ?? null,
        attachmentType: attachmentType ?? null,
      },
      select: messageSelect,
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return message;
};

// ─────────────────────────────────────────────────────────────────────────────
// sendMessageHttp  —  HTTP-facing wrapper: access check + send
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessageHttp = async (
  senderId: string,
  conversationId: string,
  content?: string,
  attachmentUrl?: string,
  attachmentType?: string,
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { customerId: true, vendorId: true, vendor: { select: { userId: true } } },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const isCustomer = conversation.customerId === senderId;
  const isVendor   = conversation.vendor.userId === senderId;
  if (!isCustomer && !isVendor) throw ApiError.forbidden('You are not a participant in this conversation');

  return sendMessage(senderId, conversationId, content, attachmentUrl, attachmentType);
};

// ─────────────────────────────────────────────────────────────────────────────
// getConversationParticipants  —  returns { customerId, vendorUserId }
// ─────────────────────────────────────────────────────────────────────────────
export const getConversationParticipants = async (conversationId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      customerId: true,
      vendor: { select: { userId: true } },
    },
  });
  if (!conversation) return null;
  return {
    customerId: conversation.customerId,
    vendorUserId: conversation.vendor.userId,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// markMessagesRead  —  mark all unread messages NOT sent by current user as read
// ─────────────────────────────────────────────────────────────────────────────
export const markMessagesRead = async (
  conversationId: string,
  readerId: string
): Promise<number> => {
  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      isRead: false,
      senderId: { not: readerId },
    },
    data: { isRead: true, readAt: new Date() },
  });
  return result.count;
};
*/
