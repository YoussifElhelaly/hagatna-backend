import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

function parseCsCartDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') return new Date();
  try {
    const cleaned = dateStr.replace(/"/g, '').trim();
    const parsedTimestamp = Date.parse(cleaned);
    
    if (!isNaN(parsedTimestamp)) {
      return new Date(parsedTimestamp);
    }
  } catch (e) {}
  return new Date();
}

// 🎯 الخريطة السحرية المبنية على السكيما بتاعتك بالملي
function mapOrderStatus(csCartStatus: string): any {
  // CS-Cart: C=Complete, O=Open, P=Processing, I=Cancelled, D=Declined, F=Failed
  switch (csCartStatus) {
    case 'C': return 'delivered';   // المكتمل في سكيما حاجتنا هو delivered
    case 'O': return 'pending';     
    case 'P': return 'processing';  
    case 'I': return 'cancelled';   
    case 'D': return 'cancelled';   // كالعادة المرفوض بنرميه cancelled
    case 'F': return 'cancelled';      
    default: return 'pending';
  }
}

async function importRealOrders() {
  const filePath = path.join(__dirname, './orders_general_06142026.csv'); 
  const rawRows: any[] = [];

  console.log("⏳ جاري قراءة ملف الـ Orders الحقيقي الخاص بـ CS-Cart...");

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: any) => rawRows.push(data))
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  console.log(`📊 إجمالي الطلبات المقروءة من الملف: ${rawRows.length}`);
  console.log("🚀 البدء في معالجة الطلبات وربطها بالعملاء والتجار الحقيقيين...");

  // كاش للتجار لتسريع عملية البحث
  const vendorCache = new Map<string, string>(); 
  const allVendors = await prisma.vendorProfile.findMany();
  for (const v of allVendors) {
    const nameKey = (v as any).storeName?.en?.trim()?.toLowerCase() || '';
    if (nameKey) vendorCache.set(nameKey, v.id);
  }

  const fallbackVendor = allVendors[0];
  let successCount = 0;

  for (const row of rawRows) {
    const orderId = row['Order ID'];
    const email = row['E-mail']?.trim()?.toLowerCase();
    const firstName = row['First name'] || 'Client';
    const lastName = row['Last name'] || '';
    
    const totalAmount = parseFloat(row['Total']) || 0;
    const subtotalAmount = parseFloat(row['Subtotal']) || totalAmount;

    const csvVendor = row['Vendor']?.trim()?.toLowerCase();
    const orderDate = parseCsCartDate(row['Date']);

    if (!orderId || !email) continue;

    try {
      // 1. البحث عن أو إنشاء العميل
      let customer = await prisma.user.findUnique({ where: { email } });
      if (!customer) {
        customer = await prisma.user.create({
          data: {
            email: email,
            name: `${firstName} ${lastName}`.trim(),
            role: 'customer',
          } as any
        });
      }

      // 2. تجهيز بيانات عنوان الشحن بصيغة JSON كـ Snapshot زي ما السكيما طالبة
      const shippingAddressSnapshot = {
        firstName: row['Shipping: first name'] || firstName,
        lastName: row['Shipping: last name'] || lastName,
        address: row['Shipping: address'] || '',
        city: row['Shipping: city'] || 'Cairo',
        state: row['Shipping: state'] || '',
        country: row['Shipping: country'] || 'EG',
        zipcode: row['Shipping: zipcode'] || '',
      };

      // 3. تحديد الستاتس والـ PaymentMethod بالظبط حسب الـ Enums الصح
      const finalStatus = mapOrderStatus(row['Status']);
      const finalPaymentStatus = row['Status'] === 'C' ? 'completed' : 'pending';

      // 4. حقن الطلب في الداتابيز بنجاح 🎯
      await prisma.order.create({
        data: {
          orderNumber: String(orderId),
          total: totalAmount,         
          subtotal: subtotalAmount,
          status: finalStatus, 
          paymentMethod: 'cod', // مفيش CASH، البديل الصح في سكيما حاجتنا هو cod
          paymentStatus: finalPaymentStatus,
          shippingAddress: shippingAddressSnapshot, // حقن الـ JSON المعتمد
          createdAt: orderDate,
          notes: row['Notes'] || null,
          user: {
            connect: { id: customer.id }
          }
        }
      });

      successCount++;
      console.log(`🛒 [${successCount}/${rawRows.length}] تم ترحيل الطلب رقم [#${orderId}] بنجاح!`);

    } catch (error: any) {
      console.error(`❌ فشل في الطلب رقم [${orderId}]:`, error.message || error);
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 تم الانتهاء من الـ Migration للطلبات الحقيقية!`);
  console.log(`✅ إجمالي الطلبات التي تم ترحيلها بنجاح: ${successCount}`);
  console.log('=============================================\n');
}

importRealOrders()
  .catch((e) => console.error("💥 خطأ غير متوقع في السكربت بالكامل:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });