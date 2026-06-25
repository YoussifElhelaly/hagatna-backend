import { z } from 'zod';

export const SubmitContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(255),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export const ContactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['new', 'read', 'replied']).optional(),
  search: z.string().optional(),
});

export const UpdateContactStatusSchema = z.object({
  status: z.enum(['new', 'read', 'replied']),
});
