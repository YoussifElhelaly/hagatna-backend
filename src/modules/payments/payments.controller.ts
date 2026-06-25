import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ApiError } from '@shared/utils/ApiError';
import { logger } from '@shared/utils/logger';
import type { JwtPayload } from '@shared/types';
import type { InitiateCardPaymentInput, InitiateWalletPaymentInput, PaymobWebhookBody } from './payments.types';
import * as paymobService from './payments.service';

// ─── POST /payments/initiate ──────────────────────────────────────────────────
// Authenticated customer initiates card payment → receives iframe URL.
export const initiateCard = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const { orderNumber } = req.body as InitiateCardPaymentInput;

  const result = await paymobService.initiateCardPayment(orderNumber, userId);

  return sendCreated(res, 'Card payment initiated', result);
});

// ─── POST /payments/wallet ────────────────────────────────────────────────────
// Authenticated customer initiates mobile-wallet payment → receives redirect URL.
export const initiateWallet = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const { orderNumber, walletMobileNumber } = req.body as InitiateWalletPaymentInput;

  const result = await paymobService.initiateWalletPayment(orderNumber, userId, walletMobileNumber);

  return sendCreated(res, 'Wallet payment initiated', result);
});

// ─── POST /payments/webhook/paymob ────────────────────────────────────────────
// Public endpoint — Paymob posts here after every transaction.
// HMAC arrives either in query string (?hmac=...) or body.obj.hmac.
export const paymobWebhook = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as PaymobWebhookBody;

  // Paymob sends HMAC as a query param: ?hmac=<hex>
  const receivedHmac =
    (req.query.hmac as string | undefined) ??
    (req.headers['hmac'] as string | undefined) ??
    '';

  if (!receivedHmac) {
    logger.warn('Paymob webhook received without HMAC');
    throw new ApiError(400, 'Missing HMAC');
  }

  // Acknowledge non-TRANSACTION events before HMAC check (no transaction obj to validate against)
  if (body.type !== 'TRANSACTION') {
    return sendSuccess({ res, message: 'Event acknowledged' });
  }

  const transaction = body.obj;
  if (!transaction) throw new ApiError(400, 'Missing transaction object');

  // HMAC validation must happen before any processing
  const isValid = paymobService.validateWebhookHmac(transaction, receivedHmac);
  if (!isValid) {
    logger.warn('Paymob webhook HMAC mismatch', { txId: transaction?.id });
    throw new ApiError(401, 'Invalid HMAC signature');
  }

  // Await processing — return 500 on failure so Paymob retries
  await paymobService.handleTransaction(transaction);

  return sendSuccess({ res, message: 'Webhook received' });
});

// ─── GET /payments/order/:orderNumber ─────────────────────────────────────────
// Authenticated customer fetches the payment status of their order.
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user as JwtPayload;
  const { orderNumber } = req.params;

  const { prisma } = await import('@database/prisma/client');

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id:            true,
      userId:        true,
      orderNumber:   true,
      paymentStatus: true,
      paymentMethod: true,
      total:         true,
      payment: {
        select: {
          id:              true,
          status:          true,
          method:          true,
          transactionId:   true,
          paidAt:          true,
          createdAt:       true,
        },
      },
    },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== userId) throw ApiError.forbidden('Access denied');

  return sendSuccess({ res, message: 'Payment status retrieved', data: order });
});
