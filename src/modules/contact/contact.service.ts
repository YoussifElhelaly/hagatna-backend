import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { sendContactEmailToAdmin } from '@shared/utils/email';
import { env } from '@config/env';
import type { SubmitContactInput, ContactQueryParams, PaginatedContactMessages } from './contact.types';

// ── submit contact message (public) ──────────────────────────────────
export const submitContactMessage = async (input: SubmitContactInput): Promise<void> => {
  const message = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
    },
  });

  // Send email notification to admin
  const adminEmail = env.SMTP_USER || env.EMAIL_FROM;
  if (adminEmail) {
    sendContactEmailToAdmin(
      adminEmail,
      message.name,
      message.email,
      message.subject,
      message.message,
      message.id,
    );
  }
};

// ── get all contact messages (admin) ──────────────────────────────────
export const getContactMessages = async (params: ContactQueryParams): Promise<PaginatedContactMessages> => {
  const { page = 1, limit = 20, status, search } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── get single contact message (admin) ───────────────────────────────
export const getContactMessageById = async (id: string) => {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw ApiError.notFound('Contact message not found');

  // Auto-mark as read if it's new
  if (message.status === 'new') {
    await prisma.contactMessage.update({
      where: { id },
      data: { status: 'read' },
    });
    message.status = 'read';
  }

  return message;
};

// ── update contact message status (admin) ────────────────────────────
export const updateContactStatus = async (id: string, status: string) => {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw ApiError.notFound('Contact message not found');

  const updateData: Record<string, any> = { status };
  if (status === 'replied') {
    updateData.repliedAt = new Date();
  }

  return prisma.contactMessage.update({
    where: { id },
    data: updateData,
  });
};

// ── delete contact message (admin) ───────────────────────────────────
export const deleteContactMessage = async (id: string): Promise<void> => {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw ApiError.notFound('Contact message not found');
  await prisma.contactMessage.delete({ where: { id } });
};

// ── get contact stats (admin) ────────────────────────────────────────
export const getContactStats = async () => {
  const [total, newCount, readCount, repliedCount] = await Promise.all([
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { status: 'new' } }),
    prisma.contactMessage.count({ where: { status: 'read' } }),
    prisma.contactMessage.count({ where: { status: 'replied' } }),
  ]);

  return { total, new: newCount, read: readCount, replied: repliedCount };
};
