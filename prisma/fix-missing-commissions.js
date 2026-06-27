/**
 * Fix Missing Vendor Commissions (plain JS for Docker)
 * Usage:  node fix-missing-commissions.js          (dry run)
 *         node fix-missing-commissions.js --apply   (apply)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--apply');
const RATE = 10.00;

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made' : '🚀 APPLYING CHANGES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const topVendor = await prisma.vendorProfile.findFirst({
    where: { products: { some: { deletedAt: null } } },
    orderBy: { products: { _count: 'desc' } },
    select: { id: true, storeName: true },
  });
  if (!topVendor) { console.error('❌ No vendor found!'); process.exit(1); }
  console.log('📦 Default vendor:', JSON.stringify(topVendor.storeName), topVendor.id);
  console.log('📊 Commission rate: ' + RATE + '%\n');

  const defaultProduct = await prisma.product.findFirst({
    where: { deletedAt: null, status: 'active' },
    select: { id: true },
  });
  if (!defaultProduct) { console.error('❌ No active product found!'); process.exit(1); }

  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'completed', items: { none: {} } },
    select: { id: true, orderNumber: true, total: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('📋 Found ' + orders.length + ' completed orders without items\n');
  if (orders.length === 0) { console.log('✅ Nothing to fix.'); return; }

  let total = 0, commission = 0, created = 0, errors = 0;

  for (const order of orders) {
    const orderTotal = Number(order.total);
    const comm = parseFloat((orderTotal * RATE / 100).toFixed(2));
    const net = parseFloat((orderTotal - comm).toFixed(2));
    total += orderTotal;
    commission += comm;

    try {
      if (!DRY_RUN) {
        const item = await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: defaultProduct.id,
            variantId: null,
            vendorId: topVendor.id,
            productSnapshot: { name: { en: 'Imported Order Item', ar: 'عنصر طلب مستورد' }, sku: 'IMPORTED-' + order.orderNumber },
            quantity: 1,
            unitPrice: order.total,
            subtotal: order.total,
            status: 'delivered',
          },
        });
        await prisma.vendorCommission.create({
          data: {
            vendorId: topVendor.id,
            orderId: order.id,
            orderItemId: item.id,
            grossAmount: order.total,
            commissionRate: RATE,
            commissionAmount: comm,
            netAmount: net,
            status: 'completed',
            createdAt: order.createdAt,
          },
        });
      }
      created++;
      console.log('  ✅ ' + (order.orderNumber || order.id.slice(0,8)) + ' | ' + orderTotal.toFixed(2) + ' | commission: ' + comm.toFixed(2));
    } catch (e) {
      errors++;
      console.log('  ❌ ' + (order.orderNumber || order.id.slice(0,8)) + ' | ' + e.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Orders: ' + created + '/' + orders.length);
  console.log('  GMV:    ' + total.toFixed(2));
  console.log('  Comm:   ' + commission.toFixed(2));
  console.log('  Errors: ' + errors);

  if (!DRY_RUN) {
    const g = await prisma.order.aggregate({ where: { paymentStatus: 'completed' }, _sum: { total: true }, _count: { id: true } });
    const i = await prisma.vendorCommission.aggregate({ where: { order: { paymentStatus: 'completed' } }, _sum: { commissionAmount: true } });
    const gmv = Number(g._sum.total || 0);
    const inc = Number(i._sum.commissionAmount || 0);
    console.log('\n🔍 VERIFICATION');
    console.log('  GMV:              ' + gmv.toFixed(2));
    console.log('  Platform Income:  ' + inc.toFixed(2));
    console.log('  Commission Ratio: ' + (gmv > 0 ? ((inc / gmv) * 100).toFixed(2) : '0') + '%');
    console.log('  Completed Orders: ' + g._count.id);
  } else {
    console.log('\n⚠️  DRY RUN. Run with --apply to execute.');
  }
}

main().catch(function(e) { console.error('❌', e); process.exit(1); }).finally(function() { prisma.$disconnect(); });
