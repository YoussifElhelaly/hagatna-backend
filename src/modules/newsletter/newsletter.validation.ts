import { z } from 'zod';

export const SubscribeNewsletterSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});
