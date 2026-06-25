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

async function importVendors() {
  // قراءة الملف الجديد المخصص للتجار
  const filePath = path.join(__dirname, './vendors__06142026.csv'); 
  const rawRows: any[] = [];

  console.log("⏳ جاري قراءة ملف الـ CSV المخصص للتجار الحقيقيين...");

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: any) => rawRows.push(data))
      .on('end', () => resolve())
      .on('error', (err: any) => reject(err));
  });

  console.log(`📊 إجمالي التجار المقروءين من الملف: ${rawRows.length}`);
  console.log("🚀 البدء في معالجة وحقن التجار الحقيقيين في الداتابيز...");

  let successCount = 0;
  let skipCount = 0;

  // لتتبع الـ slugs المستخدمة في نفس الرن عشان نضمن عدم التكرار حتى لو نفس اسم المتجر
  const usedSlugs = new Set<string>();

  for (const row of rawRows) {
    const vendorName = row['Vendor name']?.trim();
    const email = row['E-mail']?.trim()?.toLowerCase();

    if (!vendorName || !email) {
      continue; // تخطي الأسطر الفاضية أو غير المكتملة
    }

    // تجهيز الـ Slug والتأكد من انفراده
    let baseSlug = generateSlug(vendorName);
    if (!baseSlug) baseSlug = 'vendor';
    
    let storeSlug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(storeSlug)) {
      storeSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    usedSlugs.add(storeSlug);

    try {
      // 1. فحص هل المستخدم موجود بالإيميل ده مسبقاً؟
      let user = await prisma.user.findUnique({ where: { email } });
      
      if (user) {
        // لو اليوزر موجود، بنشوف هل عنده بروفايل تاجر؟
        const existingProfile = await prisma.vendorProfile.findFirst({
          where: { userId: user.id }
        });
        
        if (existingProfile) {
          console.log(`⏭️ التاجر مسجل بالفعل مسبقاً بالإيميل: ${email}`);
          skipCount++;
          continue;
        }
      } else {
        // 2. إنشاء يوزر جديد للتاجر ببياناته الحقيقية
        user = await prisma.user.create({
          data: {
            email: email,
            name: vendorName,
            role: 'vendor'
            // لو السكيما فيها حقل موبايل تقدر تفكه هنا:
            // phone: row['Phone']
          } as any
        });
      }

      // 3. إنشاء البروفايل الخاص بالتاجر وربطه باليوزر
      await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          storeName: { en: vendorName, ar: vendorName }, // حفظ الاسم لـ كلا اللغتين كبداية
          storeSlug: storeSlug,
          status: 'approved'
        } as any
      });

      successCount++;
      console.log(`👤 [${successCount}] تم إنشاء حساب تاجر حقيقي: ${vendorName} ➔ 📧 ${email}`);

    } catch (error: any) {
      console.error(`❌ فشل في إدخال التاجر [${vendorName}]:`, error.message);
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 تم الانتهاء من نقل جميع التجار بنجاح!`);
  console.log(`➕ حسابات تجار حقيقية تم إنشاؤها: ${successCount}`);
  console.log(`⏭️ تجار تم تخطيهم لوجودهم مسبقاً: ${skipCount}`);
  console.log('=============================================\n');
}

importVendors()
  .catch((e) => console.error("💥 خطأ غير متوقع:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });