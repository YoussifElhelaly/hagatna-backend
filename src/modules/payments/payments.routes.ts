import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { validate } from '@shared/middlewares/validate';
import { idempotency } from '@shared/middlewares/idempotency';
import { env } from '@config/env';
import { initiateCardBody, initiateWalletBody } from './payments.validation';
import {
  initiateCard,
  initiateWallet,
  paymobWebhook,
  getPaymentStatus,
} from './payments.controller';

const router = Router();

// ─── Feature flag ─────────────────────────────────────────────────────────────
// Paymob is disabled when any of the required env vars are missing.
export const isPaymobEnabled =
  Boolean(env.PAYMOB_API_KEY) &&
  Boolean(env.PAYMOB_HMAC_SECRET) &&
  Boolean(env.PAYMOB_IFRAME_ID) &&
  Boolean(env.PAYMOB_INTEGRATION_ID_CARD) &&
  Boolean(env.PAYMOB_INTEGRATION_ID_WALLET);

/**
 * Middleware that returns 503 when Paymob is not configured.
 * Applied to every route in this router so no payment endpoint is reachable
 * until all five required env vars are set.
 */
const paymobGuard = (_req: Request, res: Response, next: NextFunction): void => {
  if (!isPaymobEnabled) {
    res.status(503).json({
      success: false,
      message: 'Payment gateway is temporarily unavailable. Please try again later.',
      code: 'PAYMENT_GATEWAY_DISABLED',
    });
    return;
  }
  next();
};

// Apply guard to every route below
router.use(paymobGuard);

// ─── Public — Paymob webhook ──────────────────────────────────────────────────
// Must be BEFORE authenticate middleware.
// Paymob posts here with ?hmac=<signature> in the query string.
router.post('/webhook/paymob', paymobWebhook);

// ─── Authenticated routes ─────────────────────────────────────────────────────
router.use(authenticate);

// Initiate card payment → returns iframe URL + payment_key
// POST /api/v1/payments/initiate
router.post('/initiate', validate({ body: initiateCardBody }), idempotency, initiateCard);

// Initiate mobile wallet payment → returns redirect URL
// POST /api/v1/payments/wallet
router.post('/wallet', validate({ body: initiateWalletBody }), idempotency, initiateWallet);

// Get payment status for a specific order
// GET /api/v1/payments/order/:orderNumber
router.get('/order/:orderNumber', getPaymentStatus);

export default router;
