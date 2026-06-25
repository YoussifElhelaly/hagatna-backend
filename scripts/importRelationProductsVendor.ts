import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

async function relinkProducts() {
  const filePath = path.join(__dirname, './products_EXAMPLE DEMO_06142026 (2).csv'); 
  const rawRows: any[] = [];

  console.log("⏳ جاري قراءة ملف المنتجات للبدء في عملية إعادة التوزيع على التجار الحقيقيين...");

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: any) => rawRows.push(data))
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  console.log(`📊 إجمالي الأسطر المقروءة: ${rawRows.length}`);
  console.log("🔄 جاري مطابقة المنتجات ونقل ملكيتها للتجار الحقيقيين...");

  // كاش في الذاكرة للتجار عشان مانعملش Query على الداتابيز في كل لفة (عشان السرعة)
  const vendorCache = new Map<string, string>(); // name -> id
  const allVendors = await prisma.vendorProfile.findMany();
  
  for (const v of allVendors) {
    // بنخزن بالاسم الصغير وبنشيل المسافات عشان نضمن التطابق
    const nameKey = (v as any).storeName?.en?.trim()?.toLowerCase() || '';
    if (nameKey) {
      vendorCache.set(nameKey, v.id);
    }
  }

  let updatedCount = 0;
  let notFoundVendorCount = 0;

  for (const row of rawRows) {
    // بنشتغل على السطور الإنجليزي عشان هي اللي فيها الداتا كاملة
    if (row.Language !== 'en') continue;

    const sku = row['Product code'] || null;
    const productNameEn = row['Product name'] || row['Product'] || '';
    const productId = row['Product id'];
    const csvVendorName = row['Vendor']?.trim()?.toLowerCase();

    if (!csvVendorName) continue;

    // توليد الـ slug بتاع المنتج عشان نلاقيه في الداتابيز
    const productSlug = sku 
      ? `${generateSlug(productNameEn)}-${sku}` 
      : `${generateSlug(productNameEn)}-${productId}`;

    // إيجاد الـ vendorId من الكاش
    const realVendorId = vendorCache.get(csvVendorName);

    if (realVendorId) {
      try {
        // تحديث المنتج بالتاجر الصحيح
        const updatedProduct = await prisma.product.updateMany({
          where: {
            slug: productSlug,
          },
          data: {
            vendorId: realVendorId
          }
        });

        if (updatedProduct.count > 0) {
          updatedCount++;
          console.log(`🔗 [${updatedCount}] تم نقل ملكية المنتج لـ ➔ [${row['Vendor']}]`);
        }
      } catch (error: any) {
        console.error(`❌ فشل في تحديث المنتج [${productNameEn}]:`, error.message);
      }
    } else {
      notFoundVendorCount++;
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 تم الانتهاء من ربط المنتجات بالتجار بنجاح!`);
  console.log(`✅ منتجات تم نقل ملكيتها للتاجر الحقيقي: ${updatedCount}`);
  console.log(`⚠️ أسطر لم يُعثر على تاجرها في الداتابيز: ${notFoundVendorCount}`);
  console.log('=============================================\n');
}

relinkProducts()
  .catch((e) => console.error("💥 خطأ غير متوقع:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });