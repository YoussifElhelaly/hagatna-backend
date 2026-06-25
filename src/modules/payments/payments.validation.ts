import { z } from 'zod';

export const initiateCardBody = z.object({
  orderNumber: z.string().min(1, 'orderNumber is required'),
});

export const initiateWalletBody = z.object({
  orderNumber:        z.string().min(1, 'orderNumber is required'),
  walletMobileNumber: z
    .string()
    .regex(/^01[0-9]{9}$/, 'Invalid Egyptian mobile number (e.g. 01001234567)'),
});
