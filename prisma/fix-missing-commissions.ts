/**
 * Fix Missing Vendor Commissions
 * ─────────────────────────────────────────────────────────────────────────────
 * Problem: 53 completed orders were imported without order_items,
 *          so no vendor_commissions records were created.
 *          Platform income shows 418.28 instead of ~9,800.
 *
 * Solution:
 *   1. Find all completed orders that have NO order_items
 *   2. Create a single order_item per order (subtotal = order.total)
 *   3. Create a vendor_commission record (10% rate)
 *
 * Usage:
 *   npx ts-node prisma/fix-missing-commissions.ts          (dry run)
 *   npx ts-node prisma/fix-missing-commissions.ts --apply  (actually run)
 */

import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--apply');

const DEFAULT_COMMISSION_RATE = 10.00;

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made' : '🚀 APPLYING CHANGES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const topVendor = await prisma.vendorProfile.findFirst({
    where: { products: { some: { deletedAt: null } } },
    orderBy: { products: { _count: 'desc' } },
    select: { id: true, storeName: true, commissionRate: true },
  });

  if (!topVendor) {
    console.error('❌ No vendor found in the database!');
    process.exit(1);
  }

  console.log(`📦 Default vendor: ${JSON.stringify(topVendor.storeName)} (${topVendor.id})`);
  console.log(`📊 Commission rate: ${DEFAULT_COMMISSION_RATE}%\n`);

  const defaultProduct = await prisma.product.findFirst({
    where: { deletedAt: null, status: 'active' },
    select: { id: true, name: true, slug: true },
  });

  if (!defaultProduct) {
    console.error('❌ No active product found!');
    process.exit(1);
  }

  const ordersWithoutItems = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.completed,
      items: { none: {} },
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      userId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📋 Found ${ordersWithoutItems.length} completed orders without items\n`);

  if (ordersWithoutItems.length === 0) {
    console.log('✅ All orders already have items. Nothing to fix.');
    return;
  }

  let totalGmv = 0;
  let totalCommission = 0;
  let created = 0;
  const errors: string[] = [];

  for (const order of ordersWithoutItems) {
    const orderTotal = Number(order.total);
    const commissionAmount = parseFloat((orderTotal * DEFAULT_COMMISSION_RATE / 100).toFixed(2));
    const netAmount = parseFloat((orderTotal - commissionAmount).toFixed(2));

    totalGmv += orderTotal;
    totalCommission += commissionAmount;

    try {
      if (!DRY_RUN) {
        const orderItem = await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: defaultProduct.id,
            variantId: null,
            vendorId: topVendor.id,
            productSnapshot: {
              name: { en: 'Imported Order Item', ar: 'عنصر طلب مستورد' },
              sku: 'IMPORTED-' + order.orderNumber,
              note: 'Auto-created for legacy order without items',
            },
            quantity: 1,
            unitPrice: order.total,
            subtotal: order.total,
            status: OrderStatus.delivered,
          },
        });

        await prisma.vendorCommission.create({
          data: {
            vendorId: topVendor.id,
            orderId: order.id,
            orderItemId: orderItem.id,
            grossAmount: order.total,
            commissionRate: DEFAULT_COMMISSION_RATE,
            commissionAmount: commissionAmount,
            netAmount: netAmount,
            status: PaymentStatus.completed,
            createdAt: order.createdAt,
          },
        });
      }

      created++;
      console.log(
        `  ✅ ${order.orderNumber || order.id.substring(0, 8)} | ` +
        `${orderTotal.toFixed(2)} | commission: ${commissionAmount.toFixed(2)}`
      );
    } catch (err: any) {
      errors.push(`${order.orderNumber}: ${err.message}`);
      console.log(`  ❌ ${order.orderNumber || order.id.substring(0, 8)} | ERROR: ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Orders processed:  ${created}/${ordersWithoutItems.length}`);
  console.log(`  Total GMV added:   ${totalGmv.toFixed(2)}`);
  console.log(`  Commission (10%):  ${totalCommission.toFixed(2)}`);
  console.log(`  Errors:            ${errors.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. To apply changes, run:');
    console.log('   npx ts-node prisma/fix-missing-commissions.ts --apply');
  } else {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════');

    const finalGmv = await prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.completed },
      _sum: { total: true },
      _count: { id: true },
    });

    const finalIncome = await prisma.vendorCommission.aggregate({
      where: { order: { paymentStatus: PaymentStatus.completed } },
      _sum: { commissionAmount: true },
    });

    const gmv = Number(finalGmv._sum.total ?? 0);
    const income = Number(finalIncome._sum.commissionAmount ?? 0);
    const ratio = gmv > 0 ? ((income / gmv) * 100).toFixed(2) : '0';

    console.log(`  GMV:              ${gmv.toFixed(2)}`);
    console.log(`  Platform Income:  ${income.toFixed(2)}`);
    console.log(`  Commission Ratio: ${ratio}%`);
    console.log(`  Completed Orders: ${finalGmv._count.id}`);
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
