import { LoyaltyTransactionType } from '@prisma/client';

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface UpdateLoyaltySettingsInput {
  isEnabled?: boolean;
  earnRatePercent?: number;      // % of order total → points
  pointValue?: number;           // 1 point = X EGP
  minRedemptionPoints?: number;  // minimum balance to redeem
  maxRedemptionPercent?: number; // max % of order coverable by points
}

// ─── Transactions query ───────────────────────────────────────────────────────
export interface LoyaltyTransactionsQuery {
  page?: number;
  limit?: number;
  type?: LoyaltyTransactionType;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
export interface EarnPointsInput {
  userId: string;
  orderId: string;
  orderTotal: number;
}

export interface RedeemPointsInput {
  userId: string;
  orderId: string;
  pointsToRedeem: number;
}
