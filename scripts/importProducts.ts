import { PrismaClient, ProductStatus } from '@prisma/client';
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

async function importProducts() {
  const filePath = path.join(__dirname, './products_EXAMPLE DEMO_06142026 (2).csv'); 
  const rawRows: any[] = [];

  console.log("⏳ جاري قراءة ملف الـ CSV وتجميع المنتجات صَح...");

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: any) => rawRows.push(data))
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  console.log(`📊 إجمالي الأسطر المقروءة: ${rawRows.length}`);

  // 1. تأمين وجود المستخدم (User)
  let defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    defaultUser = await prisma.user.create({
      data: {
        email: 'migrated_vendor@hagatna.com',
        name: 'CS-Cart Vendor User',
        role: 'vendor'
      } as any
    });
  }

  // 2. تأمين وجود التاجر (VendorProfile) مع تزويد الـ storeSlug المطلوب في الـ Schema
  let vendorProfile = await prisma.vendorProfile.findFirst();
  if (!vendorProfile) {
    vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: defaultUser.id,
        storeName: { en: 'CS-Cart Migrated Store', ar: 'متجر سي إس كارت المنقول' },
        storeSlug: 'cs-cart-migrated-store', // الـ field اللي الـ Schema طلبتها
        status: 'approved'
      } as any
    });
  }
  const defaultVendorId = vendorProfile.id;

  // 3. تأمين وجود قسم افتراضي (Fallback Category)
  let fallbackCat = await prisma.category.findUnique({ where: { slug: 'uncategorized' } });
  if (!fallbackCat) {
    fallbackCat = await prisma.category.create({
      data: { 
        name: { en: 'Uncategorized', ar: 'غير مصنف' }, 
        slug: 'uncategorized', 
        isActive: true 
      } as any
    });
    console.log("📁 تم إنشاء قسم افتراضي [غير مصنف] لتأمين المنتجات بدون أقسام.");
  }

  // --- تجميع السطور بناءً على الـ Product id لمنع الترحيل اللغوي ---
  const productsMap = new Map<string, { en?: any, ar?: any }>();
  
  for (const row of rawRows) {
    const productId = row['Product id'];
    if (!productId) continue;

    if (!productsMap.has(productId)) {
      productsMap.set(productId, {});
    }
    
    const current = productsMap.get(productId)!;
    if (row.Language === 'en') current.en = row;
    if (row.Language === 'ar') current.ar = row;
  }

  console.log(`🎯 إجمالي المنتجات الفريدة بعد التجميع ومنع الترحيل: ${productsMap.size}`);
  console.log("🚀 البدء في ضخ المنتجات والصور في الداتابيز...");

  let successCount = 0;
  let skipCount = 0;

  for (const [productId, langGroup] of productsMap.entries()) {
    const baseRow = langGroup.en || langGroup.ar;
    if (!baseRow) continue;

    // --- إيجاد الـ Category ID ---
    let finalCategoryId = fallbackCat.id;
    const categoryField = baseRow.Category;

    if (categoryField && categoryField.trim() !== "") {
      const enParts = categoryField.split('///').map((p: string) => p.trim());
      const lastCatNameEn = enParts[enParts.length - 1]; 
      const slug = generateSlug(lastCatNameEn);

      const matchedCategory = await prisma.category.findUnique({ where: { slug } });
      if (matchedCategory) {
        finalCategoryId = matchedCategory.id;
      }
    }

    // --- تجهيز بيانات المنتج اللغوية ---
    const sku = baseRow['Product code'] || null;
    
    const productNameEn = langGroup.en ? (langGroup.en['Product name'] || langGroup.en['Product']) : (langGroup.ar['Product name'] || langGroup.ar['Product']);
    const productNameAr = langGroup.ar ? (langGroup.ar['Product name'] || langGroup.ar['Product']) : productNameEn;
    
    const descEn = langGroup.en ? (langGroup.en['Description'] || '') : '';
    const descAr = langGroup.ar ? (langGroup.ar['Description'] || '') : descEn;

    const price = parseFloat(baseRow['Price']) || 0;
    const stock = parseInt(baseRow['Amount'] || baseRow['Quantity']) || 0;

    const productSlug = sku 
      ? `${generateSlug(productNameEn)}-${sku}` 
      : `${generateSlug(productNameEn)}-${productId}`;

    // --- تنظيف واستخراج اسم الصورة ---
    const rawImage = baseRow['Detailed image'] || baseRow['Image URL'] || '';
    let finalImageName = '';

    if (rawImage && rawImage.trim() !== '') {
      const cleanPath = rawImage.split('#')[0].trim();
      finalImageName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
    }

    try {
      // منع التكرار بالـ slug
      const existingProduct = await prisma.product.findUnique({ where: { slug: productSlug } });
      if (existingProduct) {
        skipCount++;
        continue;
      }

      const productInsertData: any = {
        vendorId: defaultVendorId,
        categoryId: finalCategoryId,
        name: { en: productNameEn, ar: productNameAr },
        description: { en: descEn, ar: descAr },
        slug: productSlug,
        price: price,
        sku: sku,
        stockQuantity: stock,
        status: ProductStatus.active,
      };

      if (finalImageName) {
        productInsertData.images = {
          create: {
            url: `/uploads/products/${finalImageName}`,
            altText: productNameAr,
            isPrimary: true,
            sortOrder: 0
          }
        };
      }

      await prisma.product.create({
        data: productInsertData as any // 👈 الـ Casting السحري لمنع أي إيرور تي سكريبت نهائياً
      });

      successCount++;
      console.log(`📦 [${successCount}] تم نقل: ${productNameAr}`);
    } catch (error: any) {
      console.error(`❌ فشل في نقل المنتج ID [${productId}] - ${productNameEn}:`, error.message);
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 تم الانتهاء من الـ Migration الذكي للمنتجات!`);
  console.log(`➕ منتجات تم إنشاؤها بنجاح ومطابقة لغاتها: ${successCount}`);
  console.log(`⏭️ منتجات تم تخطيها (موجودة مسبقاً): ${skipCount}`);
  console.log('=============================================\n');
}

importProducts()
  .catch((e) => console.error("💥 خطأ غير متوقع:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });