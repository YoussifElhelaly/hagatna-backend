import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

async function importCategoriesOnly() {
  const filePath = path.join(__dirname, '../products_EXAMPLE DEMO_06142026.csv'); 
  const rawRows: any[] = [];

  console.log("⏳ جاري قراءة ملف الـ CSV لاستخراج الأقسام...");

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => rawRows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📊 إجمالي الأسطر المقروءة: ${rawRows.length}`);
  console.log("🚀 البدء في معالجة شجرة الأقسام (Categories Tree)...");

  const categoryPathToIdMap = new Map<string, string>();
  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rawRows.length; i += 2) {
    const enRow = rawRows[i];
    const arRow = rawRows[i + 1];

    // التأكد من ضبط الترتيب (سطر إنجليزي يليه عربي)
    if (!enRow || enRow.Language !== 'en') {
      if (enRow && enRow.Language === 'ar') i--; 
      continue;
    }

    // لو السطر فيه قسم، نعمله معالجة
    if (enRow.Category && enRow.Category.trim() !== "") {
      const enParts = enRow.Category.split('///').map((p: string) => p.trim());
      const arParts = arRow && arRow.Category ? arRow.Category.split('///').map((p: string) => p.trim()) : enParts;

      let currentParentId: string | null = null;
      let currentPathKey = "";

      // نمشي في شجرة الأقسام مستواً بمستوى
      for (let j = 0; j < enParts.length; j++) {
        const catNameEn = enParts[j];
        const catNameAr = arParts[j] || catNameEn;
        
        // مفتاح فريد يمثل المسار كامل عشان الأقسام الفرعية المتشابهة في الاسم متضربش
        currentPathKey += (currentPathKey ? '///' : '') + catNameEn;

        if (categoryPathToIdMap.has(currentPathKey)) {
          currentParentId = categoryPathToIdMap.get(currentPathKey)!;
          skippedCount++;
        } else {
          const slug = generateSlug(catNameEn);
          
          // التأكد إذا كان القسم موجود في الداتابيز مسبقاً
          const existingCategory = await prisma.category.findUnique({ where: { slug } });
          
          if (existingCategory) {
            currentParentId = existingCategory.id;
            console.log(`⏭️ القسم موجود مسبقاً في الداتابيز: ${catNameAr}`);
          } else {
            // كارييت القسم الجديد واربطه بالـ Parent لو موجود
            const newCategory = await prisma.category.create({
              data: {
                name: { en: catNameEn, ar: catNameAr },
                slug: slug,
                parentId: currentParentId,
                isActive: true
              }
            });
            currentParentId = newCategory.id;
            createdCount++;
            console.log(`📁 تم إنشاء قسم جديد: ${catNameAr} (${currentParentId})`);
          }
          // حفظ في الماب عشان نستخدمه كلوب سريع للسطور الجاية
          categoryPathToIdMap.set(currentPathKey, currentParentId!);
        }
      }
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 تم الانتهاء من نقل الأقسام بنجاح!`);
  console.log(`➕ أقسام جديدة تم إنشاؤها: ${createdCount}`);
  console.log('=============================================\n');
}

importCategoriesOnly()
  .catch((e) => console.error("💥 خطأ:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });