import crypto from 'crypto';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { env } from '@config/env';
import { ApiError } from '@shared/utils/ApiError';
import { logger } from '@shared/utils/logger';
import { createNotification } from '@modules/notifications/notifications.service';
import { Prisma } from '@prisma/client';
import type {
  PaymobAuthResponse,
  PaymobOrderResponse,
  PaymobPaymentKeyResponse,
  PaymobBillingData,
  PaymobTransaction,
  CardPaymentInitiated,
  WalletPaymentInitiated,
} from './payments.types';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMOB_BASE = 'https://accept.paymob.com/api';

// ─── Low-level Paymob API helpers ─────────────────────────────────────────────

/** Step 1: Exchange API key for short-lived auth token (~1 hour) */
const getAuthToken = async (): Promise<string> => {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: env.PAYMOB_API_KEY }),
  });
  if (!res.ok) throw new ApiError(502, `Paymob auth failed: ${res.statusText}`);
  const data = (await res.json()) as PaymobAuthResponse;
  return data.token;
};

/** Step 2: Register an order with Paymob — returns Paymob order object */
const registerPaymobOrder = async (
  authToken:       string,
  amountCents:     number,
  currency:        string,
  merchantOrderId: string,  // our DB order UUID
): Promise<PaymobOrderResponse> => {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:        authToken,
      delivery_needed:   false,
      amount_cents:      amountCents,
      currency,
      merchant_order_id: merchantOrderId,
      items:             [],
    }),
  });
  if (!res.ok) throw new ApiError(502, `Paymob order registration failed: ${res.statusText}`);
  return (await res.json()) as PaymobOrderResponse;
};

/** Step 3: Get payment key for a specific integration */
const getPaymentKey = async (
  authToken:     string,
  paymobOrderId: number,
  amountCents:   number,
  currency:      string,
  integrationId: string,
  billingData:   PaymobBillingData,
): Promise<string> => {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:           authToken,
      amount_cents:         amountCents,
      expiration:           3600,
      order_id:             paymobOrderId,
      billing_data:         billingData,
      currency,
      integration_id:       parseInt(integrationId, 10),
      lock_order_when_paid: true,
    }),
  });
  if (!res.ok) throw new ApiError(502, `Paymob payment key failed: ${res.statusText}`);
  const data = (await res.json()) as PaymobPaymentKeyResponse;
  return data.token;
};

// ─── Billing data builder ─────────────────────────────────────────────────────

const buildBillingData = (
  recipientName: string,
  phone:         string,
  email:         string,
  street:        string,
  city:          string,
  country:       string,
  zipCode?:      string,
): PaymobBillingData => {
  const parts = recipientName.trim().split(' ');
  const firstName = parts[0] ?? 'N/A';
  const lastName  = parts.slice(1).join(' ') || 'N/A';
  return {
    apartment:       'N/A',
    email,
    floor:           'N/A',
    first_name:      firstName,
    street:          street || 'N/A',
    building:        'N/A',
    phone_number:    phone,
    shipping_method: 'PKG',
    postal_code:     zipCode ?? 'N/A',
    city,
    country,
    last_name:       lastName,
    state:           city,
  };
};

// ─── Fetch order + validate it can be paid ───────────────────────────────────

const getPayableOrder = async (orderNumber: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!order)                                        throw ApiError.notFound('Order not found');
  if (order.userId !== userId)                       throw ApiError.forbidden('Access denied');
  if (order.paymentMethod !== PaymentMethod.online)  throw ApiError.badRequest('This order uses a non-online payment method');
  if (order.paymentStatus === PaymentStatus.completed) throw ApiError.conflict('Order is already paid');
  if (order.status === OrderStatus.cancelled || order.status === OrderStatus.refunded) {
    throw ApiError.badRequest('Cannot pay for a cancelled or refunded order');
  }

  return order;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public service functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * initiateCardPayment
 * Returns an iframe URL the frontend embeds for card payment.
 */
export const initiateCardPayment = async (
  orderNumber: string,
  userId: string,
): Promise<CardPaymentInitiated> => {
  const order = await getPayableOrder(orderNumber, userId);

  const amountCents = Math.round(Number(order.total) * 100);
  const currency    = 'EGP';

  const addr = order.shippingAddress as {
    recipientName: string; phone: string; street: string;
    city: string; country: string; zipCode?: string;
  };

  const billingData = buildBillingData(
    addr.recipientName, addr.phone, order.user.email,
    addr.street, addr.city, addr.country, addr.zipCode,
  );

  // 3-step Paymob flow
  const authToken   = await getAuthToken();
  const paymobOrder = await registerPaymobOrder(authToken, amountCents, currency, order.id);
  const paymentKey  = await getPaymentKey(
    authToken, paymobOrder.id, amountCents, currency,
    env.PAYMOB_INTEGRATION_ID_CARD, billingData,
  );

  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

  // Persist a pending Payment record
  await prisma.payment.upsert({
    where:  { orderId: order.id },
    create: {
      orderId:          order.id,
      amount:           order.total,
      currency,
      method:           PaymentMethod.online,
      status:           PaymentStatus.pending,
      gatewayReference: String(paymobOrder.id),
    },
    update: {
      gatewayReference: String(paymobOrder.id),
      status:           PaymentStatus.pending,
    },
  });

  return { iframeUrl, paymentKey, paymobOrderId: paymobOrder.id };
};

/**
 * initiateWalletPayment
 * Returns a redirect URL (deep link) for Vodafone Cash / Orange Money / etc.
 */
export const initiateWalletPayment = async (
  orderNumber:       string,
  userId:            string,
  walletMobileNumber: string,
): Promise<WalletPaymentInitiated> => {
  const order = await getPayableOrder(orderNumber, userId);

  const amountCents = Math.round(Number(order.total) * 100);
  const currency    = 'EGP';

  const addr = order.shippingAddress as {
    recipientName: string; phone: string; street: string;
    city: string; country: string; zipCode?: string;
  };

  const billingData = buildBillingData(
    addr.recipientName, walletMobileNumber, order.user.email,
    addr.street, addr.city, addr.country, addr.zipCode,
  );

  const authToken   = await getAuthToken();
  const paymobOrder = await registerPaymobOrder(authToken, amountCents, currency, order.id);
  const paymentKey  = await getPaymentKey(
    authToken, paymobOrder.id, amountCents, currency,
    env.PAYMOB_INTEGRATION_ID_WALLET, billingData,
  );

  // Paymob wallet pay endpoint — returns redirect URL
  const walletRes = await fetch(`${PAYMOB_BASE}/acceptance/payments/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: { identifier: walletMobileNumber, subtype: 'WALLET' },
      payment_token: paymentKey,
    }),
  });

  if (!walletRes.ok) {
    throw new ApiError(502, `Paymob wallet initiation failed: ${walletRes.statusText}`);
  }

  const walletData = (await walletRes.json()) as {
    redirect_url?: string;
    iframe_redirection_url?: string;
  };
  const redirectUrl = walletData.redirect_url ?? walletData.iframe_redirection_url ?? '';

  // Persist Payment record
  await prisma.payment.upsert({
    where:  { orderId: order.id },
    create: {
      orderId:          order.id,
      amount:           order.total,
      currency,
      method:           PaymentMethod.online,
      status:           PaymentStatus.pending,
      gatewayReference: String(paymobOrder.id),
    },
    update: {
      gatewayReference: String(paymobOrder.id),
      status:           PaymentStatus.pending,
    },
  });

  return { redirectUrl, paymobOrderId: paymobOrder.id };
};

// ─── HMAC Validation ──────────────────────────────────────────────────────────

/**
 * Validate Paymob webhook HMAC signature.
 * Concatenate specific transaction fields in alphabetical order,
 * then HMAC-SHA512 with PAYMOB_HMAC_SECRET.
 */
export const validateWebhookHmac = (
  transaction:  PaymobTransaction,
  receivedHmac: string,
): boolean => {
  const t = transaction;
  const concat = [
    t.amount_cents,
    t.created_at,
    t.currency,
    t.error_occured,
    t.has_parent_transaction,
    t.id,
    t.integration_id,
    t.is_3d_secure,
    t.is_auth,
    t.is_capture,
    t.is_refunded,
    t.is_standalone_payment,
    t.is_voided,
    t.order?.id,
    t.owner,
    t.pending,
    t.source_data?.pan,
    t.source_data?.sub_type,
    t.source_data?.type,
    t.success,
  ]
    .map(String)
    .join('');

  const computed = crypto
    .createHmac('sha512', env.PAYMOB_HMAC_SECRET)
    .update(concat)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed.toLowerCase()),
      Buffer.from(receivedHmac.toLowerCase()),
    );
  } catch {
    return false; // Buffer length mismatch → invalid HMAC
  }
};

// ─── Handle Incoming Transaction ──────────────────────────────────────────────

/**
 * Process a verified Paymob transaction webhook.
 * Updates Payment + Order status in our DB and notifies the customer.
 */
export const handleTransaction = async (transaction: PaymobTransaction): Promise<void> => {
  // merchant_order_id = our DB order UUID (passed when registering order in Paymob)
  const orderId = transaction.order?.merchant_order_id;

  if (!orderId) {
    logger.warn('Paymob webhook: missing merchant_order_id', { txId: transaction.id });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    logger.warn('Paymob webhook: order not found', { orderId, txId: transaction.id });
    return;
  }

  const paymentStatus: PaymentStatus = transaction.success
    ? PaymentStatus.completed
    : transaction.is_refunded
    ? PaymentStatus.refunded
    : PaymentStatus.failed;

  const newOrderStatus: OrderStatus = transaction.success
    ? OrderStatus.confirmed
    : order.status; // keep existing status on failure

  // Update Payment + Order atomically — if either fails, both roll back
  await prisma.$transaction([
    prisma.payment.upsert({
      where:  { orderId },
      create: {
        orderId,
        amount:           order.total,
        currency:         transaction.currency,
        method:           PaymentMethod.online,
        status:           paymentStatus,
        transactionId:    String(transaction.id),
        gatewayReference: String(transaction.order.id),
        gatewayResponse:  transaction as unknown as Prisma.InputJsonValue,
        paidAt:           transaction.success ? new Date() : undefined,
      },
      update: {
        status:          paymentStatus,
        transactionId:   String(transaction.id),
        gatewayResponse: transaction as unknown as Prisma.InputJsonValue,
        paidAt:          transaction.success ? new Date() : undefined,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data:  { paymentStatus, status: newOrderStatus },
    }),
  ]);

  // Notify customer
  if (transaction.success) {
    await createNotification({
      userId: order.userId,
      type:   'payment',
      title:  { en: 'Payment Confirmed', ar: 'تم تأكيد الدفع' },
      body: {
        en: `Your payment for order ${order.orderNumber} was successful.`,
        ar: `تم استلام دفعتك للطلب ${order.orderNumber} بنجاح.`,
      },
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });
  } else if (!transaction.pending) {
    await createNotification({
      userId: order.userId,
      type:   'payment',
      title:  { en: 'Payment Failed', ar: 'فشل الدفع' },
      body: {
        en: `Payment for order ${order.orderNumber} failed. Please try again.`,
        ar: `فشل دفع الطلب ${order.orderNumber}. يرجى المحاولة مرة أخرى.`,
      },
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });
  }

  logger.info('Paymob transaction processed', {
    orderId,
    txId:          transaction.id,
    success:       transaction.success,
    paymentStatus,
  });
};
