import { LoyaltyTransactionType, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type {
  UpdateLoyaltySettingsInput,
  LoyaltyTransactionsQuery,
  EarnPointsInput,
  RedeemPointsInput,
} from './loyalty.types';

// ─────────────────────────────────────────────────────────────────────────────
// getSettings  —  returns the singleton (creates it if missing)
// ─────────────────────────────────────────────────────────────────────────────
export const getSettings = async () => {
  return prisma.loyaltySettings.upsert({
    where:  { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
    include: {
      redeemableCategories: {
        select: {
          categoryId: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// getRedeemableCategoryIds  —  internal helper used by placeOrder
// Returns empty array = all categories allowed
// ─────────────────────────────────────────────────────────────────────────────
export const getRedeemableCategoryIds = async (): Promise<string[]> => {
  const rows = await prisma.loyaltyRedeemableCategory.findMany({
    where:  { settingsId: 'singleton' },
    select: { categoryId: true },
  });
  return rows.map((r) => r.categoryId);
};

// ─────────────────────────────────────────────────────────────────────────────
// addRedeemableCategory  —  admin: allow points redemption on a category
// ─────────────────────────────────────────────────────────────────────────────
export const addRedeemableCategory = async (categoryId: string) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.deletedAt) throw ApiError.notFound('Category not found');

  // Ensure singleton exists
  await prisma.loyaltySettings.upsert({
    where: { id: 'singleton' }, update: {}, create: { id: 'singleton' },
  });

  await prisma.loyaltyRedeemableCategory.upsert({
    where:  { settingsId_categoryId: { settingsId: 'singleton', categoryId } },
    update: {},
    create: { settingsId: 'singleton', categoryId },
  });

  return getSettings();
};

// ─────────────────────────────────────────────────────────────────────────────
// removeRedeemableCategory  —  admin: remove category from allowed list
// ─────────────────────────────────────────────────────────────────────────────
export const removeRedeemableCategory = async (categoryId: string) => {
  await prisma.loyaltyRedeemableCategory.deleteMany({
    where: { settingsId: 'singleton', categoryId },
  });
  return getSettings();
};

// ─────────────────────────────────────────────────────────────────────────────
// updateSettings  —  admin only
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = async (input: UpdateLoyaltySettingsInput) => {
  return prisma.loyaltySettings.upsert({
    where:  { id: 'singleton' },
    update: input,
    create: { id: 'singleton', ...input },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// getOrCreateAccount  —  internal helper
// ─────────────────────────────────────────────────────────────────────────────
const getOrCreateAccount = async (
  userId: string,
  tx: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient
) => {
  const existing = await (tx as any).loyaltyAccount.findUnique({ where: { userId } });
  if (existing) return existing;
  return (tx as any).loyaltyAccount.create({ data: { userId } });
};

// ─────────────────────────────────────────────────────────────────────────────
// getMyAccount  —  customer's own account + recent transactions
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAccount = async (
  userId: string,
  query: LoyaltyTransactionsQuery
) => {
  const { page = 1, limit = 20, type } = query;
  const skip = (page - 1) * limit;

  const account = await prisma.loyaltyAccount.upsert({
    where:  { userId },
    update: {},
    create: { userId },
  });

  const where: Prisma.LoyaltyTransactionWhereInput = {
    accountId: account.id,
    ...(type && { type }),
  };

  const [transactions, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:           true,
        type:         true,
        points:       true,
        balanceAfter: true,
        description:  true,
        createdAt:    true,
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);

  return {
    balance:       account.balance,
    totalEarned:   account.totalEarned,
    totalRedeemed: account.totalRedeemed,
    transactions,
    meta: buildPaginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getAccountByUserId  —  admin: view any user's account
// ─────────────────────────────────────────────────────────────────────────────
export const getAccountByUserId = async (
  userId: string,
  query: LoyaltyTransactionsQuery
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  return getMyAccount(userId, query);
};

// ─────────────────────────────────────────────────────────────────────────────
// previewEarn  —  how many points will an order earn?
// ─────────────────────────────────────────────────────────────────────────────
export const previewEarn = async (subtotal: number) => {
  const settings = await getSettings();
  if (!settings.isEnabled) return { pointsToEarn: 0, settings };
  const pointsToEarn = Math.floor((Number(settings.earnRatePercent) / 100) * subtotal);
  return { pointsToEarn, settings };
};

// ─────────────────────────────────────────────────────────────────────────────
// previewRedeem  —  how much can the user redeem on an order?
// ─────────────────────────────────────────────────────────────────────────────
export const previewRedeem = async (userId: string, subtotal: number) => {
  const settings = await getSettings();
  if (!settings.isEnabled) return { maxPoints: 0, maxDiscount: 0, currentBalance: 0, settings };

  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  const balance = account?.balance ?? 0;

  const maxDiscountByPercent = (Number(settings.maxRedemptionPercent) / 100) * subtotal;
  const maxDiscountByBalance = balance * Number(settings.pointValue);
  const maxDiscount = Number(Math.min(maxDiscountByPercent, maxDiscountByBalance).toFixed(2));
  const maxPoints = Math.floor(maxDiscount / Number(settings.pointValue));

  return { maxPoints, maxDiscount, currentBalance: balance, settings };
};

// ─────────────────────────────────────────────────────────────────────────────
// earnPoints  —  called inside placeOrder transaction
// ─────────────────────────────────────────────────────────────────────────────
export const earnPoints = async (
  input: EarnPointsInput,
  tx: Prisma.TransactionClient
) => {
  const settings = await (tx as any).loyaltySettings.findUnique({ where: { id: 'singleton' } });
  if (!settings?.isEnabled) return 0;

  const points = Math.floor((Number(settings.earnRatePercent) / 100) * input.orderTotal);
  if (points <= 0) return 0;

  // Compute expiry date (0 = never)
  const expireDays: number = settings.pointsExpireAfterDays ?? 365;
  const expiresAt = expireDays > 0
    ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000)
    : null;

  const account = await (tx as any).loyaltyAccount.upsert({
    where:  { userId: input.userId },
    update: {
      balance:      { increment: points },
      totalEarned:  { increment: points },
    },
    create: {
      userId:       input.userId,
      balance:      points,
      totalEarned:  points,
    },
  });

  await (tx as any).loyaltyTransaction.create({
    data: {
      accountId:    account.id,
      type:         LoyaltyTransactionType.earned,
      points,
      balanceAfter: account.balance,
      orderId:      input.orderId,
      description:  `Earned from order`,
      expiresAt,
    },
  });

  return points;
};

// ─────────────────────────────────────────────────────────────────────────────
// redeemPoints  —  called inside placeOrder transaction; returns discount amount
// ─────────────────────────────────────────────────────────────────────────────
export const redeemPoints = async (
  input: RedeemPointsInput,
  orderTotal: number,
  tx: Prisma.TransactionClient
): Promise<number> => {
  const settings = await (tx as any).loyaltySettings.findUnique({ where: { id: 'singleton' } });
  if (!settings?.isEnabled) throw ApiError.badRequest('Loyalty program is currently disabled');

  const account = await (tx as any).loyaltyAccount.findUnique({
    where: { userId: input.userId },
  });
  if (!account) throw ApiError.badRequest('You have no loyalty points');

  if (account.balance < settings.minRedemptionPoints) {
    throw ApiError.badRequest(
      `You need at least ${settings.minRedemptionPoints} points to redeem`
    );
  }
  if (input.pointsToRedeem > account.balance) {
    throw ApiError.badRequest(
      `Insufficient points. You have ${account.balance} points`
    );
  }

  const discountAmount = Number(
    (input.pointsToRedeem * Number(settings.pointValue)).toFixed(2)
  );

  const maxAllowed = Number(
    ((Number(settings.maxRedemptionPercent) / 100) * orderTotal).toFixed(2)
  );
  if (discountAmount > maxAllowed) {
    throw ApiError.badRequest(
      `Points discount cannot exceed ${settings.maxRedemptionPercent}% of the order total`
    );
  }

  const updated = await (tx as any).loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance:       { decrement: input.pointsToRedeem },
      totalRedeemed: { increment: input.pointsToRedeem },
    },
  });

  await (tx as any).loyaltyTransaction.create({
    data: {
      accountId:    account.id,
      type:         LoyaltyTransactionType.redeemed,
      points:       -input.pointsToRedeem,
      balanceAfter: updated.balance,
      orderId:      input.orderId,
      description:  `Redeemed on order`,
    },
  });

  return discountAmount;
};

// ─────────────────────────────────────────────────────────────────────────────
// adminAdjust  —  admin manually adds or deducts points for a user
// ─────────────────────────────────────────────────────────────────────────────
export const adminAdjust = async (
  userId: string,
  points: number,     // positive = add, negative = deduct
  description: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  return prisma.$transaction(async (tx) => {
    const account = await (tx as any).loyaltyAccount.upsert({
      where:  { userId },
      update: {
        balance:      { increment: points },
        ...(points > 0
          ? { totalEarned:   { increment: points } }
          : { totalRedeemed: { increment: -points } }),
      },
      create: {
        userId,
        balance:     Math.max(0, points),
        totalEarned: points > 0 ? points : 0,
      },
    });

    if (account.balance < 0) {
      throw ApiError.badRequest('Adjustment would result in negative balance');
    }

    await (tx as any).loyaltyTransaction.create({
      data: {
        accountId:    account.id,
        type:         LoyaltyTransactionType.adjusted,
        points,
        balanceAfter: account.balance,
        description,
      },
    });

    return { balance: account.balance, adjusted: points };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// expirePoints  —  called by a cron job (or admin trigger)
// Finds all earned transactions past their expiresAt that haven't been expired
// yet (expiredAt is null), deducts from the account balance, and creates an
// `expired` transaction record.
// ─────────────────────────────────────────────────────────────────────────────
export const expirePoints = async (): Promise<{ accountsAffected: number; totalExpired: number }> => {
  const now = new Date();

  // Find all expired-but-not-yet-processed earned transactions
  const expiredRows = await prisma.loyaltyTransaction.findMany({
    where: {
      type:      LoyaltyTransactionType.earned,
      expiresAt: { lte: now },
      expiredAt: null,
    },
    select: {
      id:        true,
      accountId: true,
      points:    true,
    },
  });

  if (expiredRows.length === 0) return { accountsAffected: 0, totalExpired: 0 };

  // Group by accountId
  const byAccount = new Map<string, { ids: string[]; total: number }>();
  for (const row of expiredRows) {
    const existing = byAccount.get(row.accountId) ?? { ids: [], total: 0 };
    existing.ids.push(row.id);
    existing.total += row.points;
    byAccount.set(row.accountId, existing);
  }

  let accountsAffected = 0;
  let totalExpired = 0;

  for (const [accountId, { ids, total }] of byAccount) {
    await prisma.$transaction(async (tx) => {
      const account = await (tx as any).loyaltyAccount.findUnique({ where: { id: accountId } });
      if (!account) return;

      const pointsToExpire = Math.min(total, account.balance); // can't go below 0
      const newBalance = Math.max(0, account.balance - pointsToExpire);

      // Mark the earned transactions as processed
      await (tx as any).loyaltyTransaction.updateMany({
        where: { id: { in: ids } },
        data:  { expiredAt: now },
      });

      // Deduct from account balance
      await (tx as any).loyaltyAccount.update({
        where: { id: accountId },
        data:  { balance: newBalance },
      });

      // Create an `expired` transaction for the record
      if (pointsToExpire > 0) {
        await (tx as any).loyaltyTransaction.create({
          data: {
            accountId,
            type:         LoyaltyTransactionType.expired,
            points:       -pointsToExpire,
            balanceAfter: newBalance,
            description:  `${pointsToExpire} نقطة انتهت صلاحيتها`,
          },
        });
      }
    });

    accountsAffected++;
    totalExpired += total;
  }

  return { accountsAffected, totalExpired };
};

// ─────────────────────────────────────────────────────────────────────────────
// getExpiringPoints  —  returns points expiring in the next N days for a user
// ─────────────────────────────────────────────────────────────────────────────
export const getExpiringPoints = async (userId: string, withinDays = 30) => {
  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  if (!account) return { points: 0, expiresBy: null };

  const deadline = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.loyaltyTransaction.findMany({
    where: {
      accountId: account.id,
      type:      LoyaltyTransactionType.earned,
      expiresAt: { lte: deadline, gt: new Date() },
      expiredAt: null,
    },
    select: { points: true, expiresAt: true },
    orderBy: { expiresAt: 'asc' },
  });

  const points = rows.reduce((sum, r) => sum + r.points, 0);
  const expiresBy = rows[0]?.expiresAt ?? null; // earliest expiry

  return { points, expiresBy };
};
