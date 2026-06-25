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

async function fixImages() {
  const filePath = path.join(__dirname, './products_EXAMPLE DEMO_06142026 (2).csv'); 
  const rawRows: any[] = [];

  console.log("⏳ جاري قراءة ملف المنتجات للوصول لروابط الصور الحية...");

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: any) => rawRows.push(data))
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  console.log(`📊 إجمالي الأسطر المقروءة: ${rawRows.length}`);
  console.log("🔄 البدء في تحديث جدول product_images بالروابط الحية المباشرة...");

  let updatedCount = 0;

  for (const row of rawRows) {
    if (row.Language !== 'en') continue;

    const sku = row['Product code'] || null;
    const productNameEn = row['Product name'] || row['Product'] || '';
    const productId = row['Product id'];
    
    const productSlug = sku 
      ? `${generateSlug(productNameEn)}-${sku}` 
      : `${generateSlug(productNameEn)}-${productId}`;

    // 1. بناخد الرابط الكامل المباشر لو موجود في خانة Image URL
    let finalLiveUrl = row['Image URL']?.trim() || '';

    // 2. لو مش موجود، بنبني الرابط بناءً على الـ Detailed image واسم السيرفر القديم
    if (!finalLiveUrl || !finalLiveUrl.startsWith('http')) {
      const rawImage = row['Detailed image'] || '';
      if (rawImage) {
        const cleanPath = rawImage.split('#')[0].trim();
        const filename = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
        
        // بناءً على هيكلة الـ CS-Cart، الفولدر الفرعي غالباً بيكون أول حرف/رقم من الـ Product id أو رقم ثابت
        // وبما إن المثال بتاعك طالع فيه الفولدر رقم 9، فهنخليه ديناميكي أو نوحده حسب الروابط الحية
        const subFolder = productId && productId.length > 0 ? productId.substring(0, 1) : '9';
        
        finalLiveUrl = `https://www.hagatnaa.com/images/detailed/${subFolder}/${filename}`;
      }
    }

    if (finalLiveUrl) {
      try {
        // البحث عن المنتج مع صوره
        const product = await prisma.product.findUnique({
          where: { slug: productSlug },
          include: { images: true }
        }) as any;

        if (product && product.images && product.images.length > 0) {
          const imageId = product.images[0].id;

          // تحديث مسار الصورة بالرابط الخارجي المباشر
          await prisma.productImage.update({
            where: { id: imageId },
            data: {
              url: finalLiveUrl
            }
          });

          updatedCount++;
          console.log(`🖼️ [${updatedCount}] تم ربط صورة حية ➔ ${productNameEn}`);
        }
      } catch (error: any) {
        console.error(`❌ فشل في تحديث صورة المنتج [${productNameEn}]:`, error.message);
      }
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 تم الانتهاء من ربط وتصحيح الصور الحية بنجاح!`);
  console.log(`✅ إجمالي الصور المحدثة بروابط مباشرة: ${updatedCount}`);
  console.log('=============================================\n');
}

fixImages()
  .catch((e) => console.error("💥 خطأ غير متوقع:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });