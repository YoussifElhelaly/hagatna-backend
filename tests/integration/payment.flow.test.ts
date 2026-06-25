import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@shared/utils/ApiError';

// ── Mock dependencies ─────────────────────────────────────────────────────────

vi.mock('@database/prisma/client', () => ({
  prisma: {
    order:   { findUnique: vi.fn(), update: vi.fn() },
    payment: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@modules/notifications/notifications.service', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@config/env', () => ({
  env: {
    NODE_ENV:                    'test',
    PAYMOB_API_KEY:              'test_key',
    PAYMOB_HMAC_SECRET:          'test_hmac_secret',
    PAYMOB_IFRAME_ID:            '12345',
    PAYMOB_INTEGRATION_ID_CARD:  '111',
    PAYMOB_INTEGRATION_ID_WALLET:'222',
  },
}));

// Mock fetch for Paymob API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import * as PaymentsService from '@modules/payments/payments.service';
import { prisma }            from '@database/prisma/client';

const mockOrder = vi.mocked(prisma.order);
const mockPayment = vi.mocked(prisma.payment);
const mockTransaction = vi.mocked(prisma.$transaction);

const fakeOrder = {
  id:             'order-abc',
  orderNumber:    'HGT-20240101-ABC12',
  userId:         'user-123',
  total:          500,
  paymentMethod:  'online' as const,
  paymentStatus:  'pending' as const,
  status:         'pending' as const,
  shippingAddress: {
    recipientName: 'Ahmed',
    phone: '01012345678',
    street: '123 Test St',
    city: 'Cairo',
    country: 'EG',
  },
  user: { email: 'ahmed@test.com', name: 'Ahmed' },
};

// ─────────────────────────────────────────────────────────────────────────────
// initiateCardPayment
// ─────────────────────────────────────────────────────────────────────────────
describe('PaymentsService.initiateCardPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when order does not exist', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(null);
    await expect(
      PaymentsService.initiateCardPayment('HGT-NOTFOUND', 'user-123')
    ).rejects.toThrow(ApiError);
  });

  it('throws 403 when order belongs to different user', async () => {
    mockOrder.findUnique.mockResolvedValueOnce({ ...fakeOrder, userId: 'other-user' });
    await expect(
      PaymentsService.initiateCardPayment('HGT-20240101-ABC12', 'user-123')
    ).rejects.toThrow(ApiError);
  });

  it('throws 409 when order is already paid', async () => {
    mockOrder.findUnique.mockResolvedValueOnce({ ...fakeOrder, paymentStatus: 'completed' });
    await expect(
      PaymentsService.initiateCardPayment('HGT-20240101-ABC12', 'user-123')
    ).rejects.toThrow(ApiError);
  });

  it('calls Paymob 3-step flow and returns iframeUrl on success', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(fakeOrder);
    mockPayment.upsert.mockResolvedValueOnce({} as never);

    // Mock 3 Paymob API calls: auth → order → payment key
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'paymob_auth_token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 99999 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'payment_key_abc' }) });

    const result = await PaymentsService.initiateCardPayment('HGT-20240101-ABC12', 'user-123');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.iframeUrl).toContain('payment_key_abc');
    expect(result.paymobOrderId).toBe(99999);
  });

  it('throws 502 when Paymob auth fails', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(fakeOrder);
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Unauthorized' });

    await expect(
      PaymentsService.initiateCardPayment('HGT-20240101-ABC12', 'user-123')
    ).rejects.toThrow(ApiError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// handleTransaction (webhook)
// ─────────────────────────────────────────────────────────────────────────────
describe('PaymentsService.handleTransaction', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseTransaction = {
    id:          12345,
    success:     true,
    pending:     false,
    is_refunded: false,
    currency:    'EGP',
    amount_cents: 50000,
    order: { id: 99999, merchant_order_id: 'order-abc' },
  };

  it('does nothing when merchant_order_id is missing', async () => {
    await PaymentsService.handleTransaction({
      ...baseTransaction,
      order: { id: 1, merchant_order_id: undefined as unknown as string },
    });
    expect(mockOrder.findUnique).not.toHaveBeenCalled();
  });

  it('does nothing when order is not found in DB', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(null);
    await PaymentsService.handleTransaction(baseTransaction);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('updates Payment + Order atomically in a transaction on success', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(fakeOrder);
    mockTransaction.mockResolvedValueOnce([{}, {}]);

    await PaymentsService.handleTransaction(baseTransaction);

    expect(mockTransaction).toHaveBeenCalledOnce();
    // Transaction array should contain both payment.upsert and order.update
    const txArg = mockTransaction.mock.calls[0][0] as unknown[];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg).toHaveLength(2);
  });

  it('updates Order to confirmed when payment succeeds', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(fakeOrder);

    let capturedUpsertData: Record<string, unknown> = {};
    let capturedUpdateData: Record<string, unknown> = {};

    // Intercept what goes into the transaction
    mockTransaction.mockImplementationOnce(async (ops: unknown[]) => {
      // Simulate running both ops
      for (const op of ops as Promise<unknown>[]) await op;
      return [{}, {}];
    });

    mockPayment.upsert.mockImplementationOnce((args) => {
      capturedUpsertData = args as Record<string, unknown>;
      return Promise.resolve({} as never);
    });
    mockOrder.update.mockImplementationOnce((args) => {
      capturedUpdateData = args as Record<string, unknown>;
      return Promise.resolve({} as never);
    });

    await PaymentsService.handleTransaction(baseTransaction);

    expect((capturedUpsertData as { create: { status: string } }).create?.status).toBe('completed');
    expect((capturedUpdateData as { data: { status: string } }).data?.status).toBe('confirmed');
  });

  it('keeps Order status unchanged when payment fails', async () => {
    mockOrder.findUnique.mockResolvedValueOnce(fakeOrder);

    let capturedUpdateData: Record<string, unknown> = {};

    mockTransaction.mockImplementationOnce(async (ops: unknown[]) => {
      for (const op of ops as Promise<unknown>[]) await op;
      return [{}, {}];
    });

    mockPayment.upsert.mockResolvedValueOnce({} as never);
    mockOrder.update.mockImplementationOnce((args) => {
      capturedUpdateData = args as Record<string, unknown>;
      return Promise.resolve({} as never);
    });

    await PaymentsService.handleTransaction({ ...baseTransaction, success: false });

    expect((capturedUpdateData as { data: { status: string } }).data?.status).toBe('pending'); // kept as-is
    expect((capturedUpdateData as { data: { paymentStatus: string } }).data?.paymentStatus).toBe('failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateWebhookHmac
// ─────────────────────────────────────────────────────────────────────────────
describe('PaymentsService.validateWebhookHmac', () => {
  it('returns false for a tampered HMAC', () => {
    const fakeTransaction = {
      id: 1, success: true, pending: false, is_refunded: false,
      currency: 'EGP', amount_cents: 100,
      order: { id: 1, merchant_order_id: 'abc' },
    };
    const result = PaymentsService.validateWebhookHmac(fakeTransaction, 'tampered_hmac');
    expect(result).toBe(false);
  });
});
