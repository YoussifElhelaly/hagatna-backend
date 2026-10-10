import { prisma } from '../src/database/prisma/client';
import { redis } from '../src/database/redis/client';

async function resetAccountsAndOrders() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('Starting Accounts & Orders Reset');
  console.log('═══════════════════════════════════════════════════════');

  // 1. Check pre-reset counts
  const before = {
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    orderStatusHistory: await prisma.orderStatusHistory.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    vendorCommissions: await prisma.vendorCommission.count(),
    shipments: await prisma.shipment.count(),
    couponUsages: await prisma.couponUsage.count(),
    loyaltyTransactions: await prisma.loyaltyTransaction.count(),
    loyaltyAccounts: await prisma.loyaltyAccount.count(),
    cartItems: await prisma.cartItem.count(),
    orderNotifications: await prisma.notification.count({
      where: { type: { in: ['order', 'payment'] } },
    }),
    orderActivityLogs: await prisma.activityLog.count({
      where: { category: { in: ['order', 'loyalty'] } },
    }),
  };

  console.log('Pre-reset counts:', before);

  // 2. Execute reset inside transaction
  await prisma.$transaction(
    async (tx) => {
      // Step A: Restore product stock for active/completed/processing orders
      console.log('1. Restoring product stock for non-cancelled orders...');
      const itemsToRestore = await tx.orderItem.findMany({
        where: {
          order: {
            status: { notIn: ['cancelled', 'refunded'] },
          },
        },
        select: {
          productId: true,
          variantId: true,
          quantity: true,
        },
      });

      for (const item of itemsToRestore) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
      console.log(`   Restored stock for ${itemsToRestore.length} order items.`);

      // Step B: Nullify orderId in reviews and conversations to preserve them
      console.log('2. Unlinking reviews and conversations from orders...');
      const reviewsUpdated = await tx.review.updateMany({
        where: { orderId: { not: null } },
        data: { orderId: null },
      });
      const convsUpdated = await tx.conversation.updateMany({
        where: { orderId: { not: null } },
        data: { orderId: null },
      });
      console.log(`   Unlinked ${reviewsUpdated.count} reviews and ${convsUpdated.count} conversations.`);

      // Step C: Delete financial transactions & payouts
      console.log('3. Deleting vendor commissions & financial payouts...');
      const commissionsDeleted = await tx.vendorCommission.deleteMany({});
      console.log(`   Deleted ${commissionsDeleted.count} vendor commission records.`);

      console.log('4. Deleting refunds and payments...');
      const refundsDeleted = await tx.refund.deleteMany({});
      const paymentsDeleted = await tx.payment.deleteMany({});
      console.log(`   Deleted ${refundsDeleted.count} refunds and ${paymentsDeleted.count} payments.`);

      // Step D: Delete shipments
      console.log('5. Deleting shipments...');
      const shipmentsDeleted = await tx.shipment.deleteMany({});
      console.log(`   Deleted ${shipmentsDeleted.count} shipments.`);

      // Step E: Delete order items & status history
      console.log('6. Deleting order status history & order items...');
      const historyDeleted = await tx.orderStatusHistory.deleteMany({});
      const itemsDeleted = await tx.orderItem.deleteMany({});
      console.log(`   Deleted ${historyDeleted.count} status records and ${itemsDeleted.count} order items.`);

      // Step F: Reset coupon usages & promotion usage counts
      console.log('7. Resetting coupon usages & promotion counters...');
      const couponsDeleted = await tx.couponUsage.deleteMany({});
      await tx.promotion.updateMany({ data: { usageCount: 0 } });
      console.log(`   Deleted ${couponsDeleted.count} coupon usages; reset all promotion usage counters to 0.`);

      // Step G: Reset loyalty points and transactions
      console.log('8. Zeroing loyalty accounts & deleting loyalty transactions...');
      const loyaltyTxDeleted = await tx.loyaltyTransaction.deleteMany({});
      const loyaltyAccountsReset = await tx.loyaltyAccount.updateMany({
        data: { balance: 0, totalEarned: 0, totalRedeemed: 0 },
      });
      console.log(`   Deleted ${loyaltyTxDeleted.count} loyalty transactions; zeroed ${loyaltyAccountsReset.count} loyalty accounts.`);

      // Step H: Delete orders
      console.log('9. Deleting all orders...');
      const ordersDeleted = await tx.order.deleteMany({});
      console.log(`   Deleted ${ordersDeleted.count} orders.`);

      // Step I: Empty test carts
      console.log('10. Clearing shopping cart items...');
      const cartItemsDeleted = await tx.cartItem.deleteMany({});
      console.log(`   Cleared ${cartItemsDeleted.count} cart items.`);

      // Step J: Remove order-related notifications & logs
      console.log('11. Removing order-related notifications & activity logs...');
      const notifsDeleted = await tx.notification.deleteMany({
        where: { type: { in: ['order', 'payment'] } },
      });
      const logsDeleted = await tx.activityLog.deleteMany({
        where: { category: { in: ['order', 'loyalty'] } },
      });
      console.log(`   Deleted ${notifsDeleted.count} notifications and ${logsDeleted.count} activity logs.`);
    },
    {
      maxWait: 15000,
      timeout: 60000,
    }
  );

  // Step K: Clear Redis cache
  console.log('12. Clearing Redis cache keys...');
  try {
    const stream = redis.scanStream({ match: 'cache:*', count: 100 });
    const keys: string[] = [];
    for await (const batch of stream) {
      keys.push(...batch);
    }
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`   Cleared ${keys.length} cache keys from Redis.`);
    } else {
      console.log('   No cache:* keys found in Redis.');
    }
  } catch (err) {
    console.warn('   Redis cache flush warning:', err);
  }

  // 3. Post-reset verification
  console.log('═══════════════════════════════════════════════════════');
  console.log('Verification After Reset:');
  const after = {
    users: await prisma.user.count(),
    vendorProfiles: await prisma.vendorProfile.count(),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    orderStatusHistory: await prisma.orderStatusHistory.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    vendorCommissions: await prisma.vendorCommission.count(),
    shipments: await prisma.shipment.count(),
    couponUsages: await prisma.couponUsage.count(),
    loyaltyTransactions: await prisma.loyaltyTransaction.count(),
    loyaltyAccounts: await prisma.loyaltyAccount.count(),
    cartItems: await prisma.cartItem.count(),
  };

  const loyaltySums = await prisma.loyaltyAccount.aggregate({
    _sum: { balance: true, totalEarned: true, totalRedeemed: true },
  });

  const commissionsSum = await prisma.vendorCommission.aggregate({
    _sum: { commissionAmount: true, netAmount: true, grossAmount: true },
  });

  console.log(JSON.stringify(after, null, 2));
  console.log('Loyalty totals:', loyaltySums._sum);
  console.log('Commissions totals:', commissionsSum._sum);
  console.log('═══════════════════════════════════════════════════════');
  console.log('RESET COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════');
}

resetAccountsAndOrders()
  .catch((err) => {
    console.error('ERROR DURING RESET:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
