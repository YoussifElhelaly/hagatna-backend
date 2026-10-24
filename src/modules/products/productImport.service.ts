import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import * as xlsx from 'xlsx';
import { ProductStatus, Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { generateUniqueSlug } from '@shared/utils/generateSlug';
import { revalidateFrontendPaths } from '@shared/utils/revalidateFrontend';
import { sanitizeDescriptionHtml } from '@shared/validation/description';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import {
  syncProductAggregates,
  deriveVariantName,
  normalizeImages,
} from './products.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportJobError {
  row: number;
  sku?: string;
  name?: string;
  type: 'error' | 'skipped' | 'warning';
  message: string;
}

interface ParsedVariant {
  options: Record<string, string>;
  name: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  stockQuantity: number;
  imageUrl?: string;
  rowNum: number;
}

interface ParsedProductGroup {
  sku: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  price: number;
  comparePrice?: number;
  stockQuantity: number;
  status: 'active' | 'draft';
  categoryId: string;
  tags: string[];
  images: string[];
  variants: ParsedVariant[];
  firstRowNum: number;
  warnings: ImportJobError[];
}

interface ParseAndValidateResult {
  validGroups: ParsedProductGroup[];
  errors: ImportJobError[];
  stats: {
    totalFileRows: number;
    totalGroups: number;
    validCount: number;
    skippedCount: number;
    errorCount: number;
  };
}

// ─── Column contract & header normalizer ──────────────────────────────────────

const HEADERS = [
  'SKU',
  'Name (EN)',
  'Name (AR)',
  'Description (EN)',
  'Description (AR)',
  'Price',
  'Compare Price',
  'Stock',
  'Status',
  'Category',
  'Tags',
  'Images',
  'Variant Options',
  'Variant Name',
  'Variant Price',
  'Variant Compare Price',
  'Variant SKU',
  'Variant Stock',
  'Variant Image',
] as const;

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase().replace(/\*+$/, '').trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// generateImportTemplate — generates 2-sheet XLSX import template
// ─────────────────────────────────────────────────────────────────────────────
export const generateImportTemplate = (): Buffer => {
  const exampleRows = [
    // Row 1: Simple product
    {
      'SKU': 'EXAMPLE-001',
      'Name (EN)': 'Wireless Headphones',
      'Name (AR)': 'سماعات رأس لاسلكية',
      'Description (EN)': 'Premium over-ear wireless headphones with active noise cancellation.',
      'Description (AR)': 'سماعات رأس لاسلكية فاخرة مزودة بتقنية إلغاء الضوضاء النشطة.',
      'Price': 199.99,
      'Compare Price': 249.99,
      'Stock': 25,
      'Status': 'active',
      'Category': 'electronics',
      'Tags': 'sale,new',
      'Images': 'https://example.com/img1.jpg',
      'Variant Options': '',
      'Variant Name': '',
      'Variant Price': '',
      'Variant Compare Price': '',
      'Variant SKU': '',
      'Variant Stock': '',
      'Variant Image': '',
    },
    // Row 2: Product EXAMPLE-002 base
    {
      'SKU': 'EXAMPLE-002',
      'Name (EN)': 'Casual T-Shirt',
      'Name (AR)': 'قميص كاجوال',
      'Description (EN)': '100% cotton casual everyday t-shirt.',
      'Description (AR)': 'قميص كاجوال من القطن 100% للاستخدام اليومي.',
      'Price': 299,
      'Compare Price': '',
      'Stock': 2,
      'Status': 'active',
      'Category': 'electronics',
      'Tags': '',
      'Images': '',
      'Variant Options': '',
      'Variant Name': '',
      'Variant Price': '',
      'Variant Compare Price': '',
      'Variant SKU': '',
      'Variant Stock': '',
      'Variant Image': '',
    },
    // Row 3: Product EXAMPLE-002 variant 1
    {
      'SKU': 'EXAMPLE-002',
      'Name (EN)': '',
      'Name (AR)': '',
      'Description (EN)': '',
      'Description (AR)': '',
      'Price': '',
      'Compare Price': '',
      'Stock': '',
      'Status': '',
      'Category': '',
      'Tags': '',
      'Images': '',
      'Variant Options': 'color:Red,size:L',
      'Variant Name': 'Red / L',
      'Variant Price': 310,
      'Variant Compare Price': '',
      'Variant SKU': 'EXAMPLE-002-R-L',
      'Variant Stock': 5,
      'Variant Image': '',
    },
    // Row 4: Product EXAMPLE-002 variant 2
    {
      'SKU': 'EXAMPLE-002',
      'Name (EN)': '',
      'Name (AR)': '',
      'Description (EN)': '',
      'Description (AR)': '',
      'Price': '',
      'Compare Price': '',
      'Stock': '',
      'Status': '',
      'Category': '',
      'Tags': '',
      'Images': '',
      'Variant Options': 'color:Blue,size:L',
      'Variant Name': 'Blue / L',
      'Variant Price': 299,
      'Variant Compare Price': '',
      'Variant SKU': 'EXAMPLE-002-B-L',
      'Variant Stock': 7,
      'Variant Image': '',
    },
  ];

  const wsData = xlsx.utils.json_to_sheet(exampleRows, { header: [...HEADERS] });
  wsData['!cols'] = [
    { wch: 16 }, // SKU
    { wch: 28 }, // Name (EN)
    { wch: 28 }, // Name (AR)
    { wch: 32 }, // Description (EN)
    { wch: 32 }, // Description (AR)
    { wch: 12 }, // Price
    { wch: 15 }, // Compare Price
    { wch: 10 }, // Stock
    { wch: 10 }, // Status
    { wch: 16 }, // Category
    { wch: 16 }, // Tags
    { wch: 32 }, // Images
    { wch: 24 }, // Variant Options
    { wch: 18 }, // Variant Name
    { wch: 14 }, // Variant Price
    { wch: 20 }, // Variant Compare Price
    { wch: 18 }, // Variant SKU
    { wch: 14 }, // Variant Stock
    { wch: 32 }, // Variant Image
  ];

  const instructionRows = [
    { 'دليل الاستيراد': 'دليل استيراد المنتجات المجمعة' },
    { 'دليل الاستيراد': '' },
    { 'دليل الاستيراد': '─── القواعد الأساسية ───' },
    { 'دليل الاستيراد': '• عمود SKU مطلوب لكل منتج ومتغير ويجب أن يكون فريداً.' },
    { 'دليل الاستيراد': '• الصفوف التي بنفس الـ SKU بتتبني منتج واحد.' },
    { 'دليل الاستيراد': '• أول صف فيه اسم = بيانات المنتج الأساسية.' },
    { 'دليل الاستيراد': '• أي صف فيه Variant Options = variant جديد للمنتج.' },
    { 'دليل الاستيراد': '• صيغة Variant Options: key:Value مفصولة بفواصل، مثال: color:Red,size:L' },
    { 'دليل الاستيراد': '• Status إما active أو draft (افتراضياً active إذا تُركت فارغة).' },
    { 'دليل الاستيراد': '• Category: يكتب اسم الفئة بالعربية أو الإنجليزية أو معرف الرابط (Slug).' },
    { 'دليل الاستيراد': '• Images: روابط الصور مفصولة بفاصلة (,) أو (|) ويجب أن تبدأ بـ https:// أو /uploads/.' },
    { 'دليل الاستيراد': '' },
    { 'دليل الاستيراد': '─── شرح الأعمدة ───' },
    { 'دليل الاستيراد': '• SKU: رمز المنتج أو المتغير الفريد (مطلوب)' },
    { 'دليل الاستيراد': '• Name (EN): اسم المنتج بالإنجليزية (مطلوب لصف المنتج الأساسي)' },
    { 'دليل الاستيراد': '• Name (AR): اسم المنتج بالعربية (مطلوب لصف المنتج الأساسي)' },
    { 'دليل الاستيراد': '• Description (EN): وصف المنتج بالإنجليزية (اختياري)' },
    { 'دليل الاستيراد': '• Description (AR): وصف المنتج بالعربية (اختياري)' },
    { 'دليل الاستيراد': '• Price: سعر بيع المنتج الأساسي (مطلوب، أكبر من صفر)' },
    { 'دليل الاستيراد': '• Compare Price: السعر قبل الخصم (اختياري، أكبر من أو يساوي صفر)' },
    { 'دليل الاستيراد': '• Stock: كمية المخزون (مطلوب، رقم صحيح أكبر من أو يساوي صفر)' },
    { 'دليل الاستيراد': '• Status: حالة المنتج (active أو draft)' },
    { 'دليل الاستيراد': '• Category: فئة المنتج، تستخدم الفئة الافتراضية إذا تركت فارغة' },
    { 'دليل الاستيراد': '• Tags: وسوم مفصولة بفواصل (بحد أقصى 20 وسماً، كل وسم حتى 50 حرفاً)' },
    { 'دليل الاستيراد': '• Images: روابط صور المنتج مفصولة بفاصلة (بحد أقصى 10 صور)' },
    { 'دليل الاستيراد': '• Variant Options: خيارات المتغير مثل color:Red,size:L (مطلوب لصفوف المتغيرات)' },
    { 'دليل الاستيراد': '• Variant Name: اسم المتغير (اختياري، يتم توليده تلقائياً من الخيارات إن تُرك فارغاً)' },
    { 'دليل الاستيراد': '• Variant Price: سعر المتغير (مطلوب لكل متغير، أكبر من صفر)' },
    { 'دليل الاستيراد': '• Variant Compare Price: السعر قبل الخصم للمتغير (اختياري)' },
    { 'دليل الاستيراد': '• Variant SKU: رمز المتغير الفريد (اختياري، فريد في الملف وقاعدة البيانات)' },
    { 'دليل الاستيراد': '• Variant Stock: كمية مخزون المتغير (مطلوب لكل متغير، رقم صحيح >= 0)' },
    { 'دليل الاستيراد': '• Variant Image: رابط صورة خاصة بالمتغير (اختياري)' },
  ];

  const wsInstructions = xlsx.utils.json_to_sheet(instructionRows);
  wsInstructions['!cols'] = [{ wch: 95 }];

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, wsData, 'Import Data');
  xlsx.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// ─────────────────────────────────────────────────────────────────────────────
// parseAndValidate — internal sheet parser & validator
// ─────────────────────────────────────────────────────────────────────────────
const parseAndValidate = async (
  buffer: Buffer,
  defaultCategoryId?: string | null
): Promise<ParseAndValidateResult> => {
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw ApiError.badRequest('الملف فارغ أو لا يحتوي على صفوف');
  }

  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  if (!rows || rows.length === 0) {
    throw ApiError.badRequest('الملف فارغ أو لا يحتوي على صفوف');
  }

  // 2. Normalize headers
  const rawHeaders = Object.keys(rows[0]);
  const headerMap = new Map<string, string>();
  for (const raw of rawHeaders) {
    headerMap.set(normalizeHeader(raw), raw);
  }

  const requiredHeaders: { key: string; label: string }[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name (en)', label: 'Name (EN)' },
    { key: 'name (ar)', label: 'Name (AR)' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' },
  ];

  const missing = requiredHeaders
    .filter(rh => !headerMap.has(rh.key))
    .map(rh => rh.label);

  if (missing.length > 0) {
    throw ApiError.badRequest(`الأعمدة المطلوبة التالية مفقودة من الملف: ${missing.join(', ')}`);
  }

  const getVal = (row: Record<string, any>, normalizedKey: string): string => {
    const actual = headerMap.get(normalizedKey);
    if (!actual) return '';
    const val = row[actual];
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };

  // 3. Build category map
  const categories = await prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id.toLowerCase(), cat.id);
    if (cat.slug) {
      categoryMap.set(cat.slug.trim().toLowerCase(), cat.id);
    }
    const nameObj = cat.name as { en?: string; ar?: string } | null;
    if (nameObj && typeof nameObj === 'object') {
      if (nameObj.en && typeof nameObj.en === 'string') {
        categoryMap.set(nameObj.en.trim().toLowerCase(), cat.id);
      }
      if (nameObj.ar && typeof nameObj.ar === 'string') {
        categoryMap.set(nameObj.ar.trim().toLowerCase(), cat.id);
      }
    }
  }

  // 4 & 5. Filter empty rows & group by SKU
  const errors: ImportJobError[] = [];
  const groupsMap = new Map<
    string,
    {
      sku: string;
      firstRowNum: number;
      rows: { row: Record<string, any>; rowNum: number }[];
    }
  >();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const isFullyEmpty = Object.values(row).every(
      v => String(v ?? '').trim() === ''
    );
    if (isFullyEmpty) {
      continue;
    }

    const sku = getVal(row, 'sku');
    if (!sku) {
      errors.push({
        row: rowNum,
        type: 'error',
        message: 'صف بدون SKU',
      });
      continue;
    }

    if (!groupsMap.has(sku)) {
      groupsMap.set(sku, {
        sku,
        firstRowNum: rowNum,
        rows: [],
      });
    }
    groupsMap.get(sku)!.rows.push({ row, rowNum });
  }

  // 10. Cap groups count
  if (groupsMap.size > 5000) {
    throw ApiError.badRequest('لا يمكن استيراد أكثر من 5000 منتج في ملف واحد');
  }

  // 6, 7, 8. Validate per group
  const candidateGroups: ParsedProductGroup[] = [];
  const seenFileVariantSkus = new Map<string, number>();

  for (const group of groupsMap.values()) {
    const groupWarnings: ImportJobError[] = [];
    let groupHasError = false;

    // 6. First row with Name (EN) or Name (AR) is product row
    const productRowEntry = group.rows.find(
      r => getVal(r.row, 'name (en)') !== '' || getVal(r.row, 'name (ar)') !== ''
    );

    if (!productRowEntry) {
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        type: 'error',
        message: 'بيانات المنتج ناقصة (الاسم مطلوب)',
      });
      continue;
    }

    const pRow = productRowEntry.row;
    const nameEn = getVal(pRow, 'name (en)');
    const nameAr = getVal(pRow, 'name (ar)');

    // 7. Validate product fields
    if (!nameEn || !nameAr) {
      groupHasError = true;
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        type: 'error',
        message: 'اسم المنتج باللغة الإنجليزية والعربية مطلوب',
      });
    }

    const priceRaw = getVal(pRow, 'price');
    const price = Number(priceRaw);
    if (priceRaw === '' || isNaN(price) || price <= 0) {
      groupHasError = true;
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        name: nameEn || nameAr,
        type: 'error',
        message: 'السعر يجب أن يكون رقماً أكبر من صفر',
      });
    }

    const stockRaw = getVal(pRow, 'stock');
    const stockQuantity = Number(stockRaw);
    if (
      stockRaw === '' ||
      isNaN(stockQuantity) ||
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      groupHasError = true;
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        name: nameEn || nameAr,
        type: 'error',
        message: 'المخزون يجب أن يكون رقماً صحيحاً 0 أو أكثر',
      });
    }

    const comparePriceRaw = getVal(pRow, 'compare price');
    let comparePrice: number | undefined = undefined;
    if (comparePriceRaw !== '') {
      const compPrice = Number(comparePriceRaw);
      if (isNaN(compPrice) || compPrice < 0) {
        groupHasError = true;
        errors.push({
          row: group.firstRowNum,
          sku: group.sku,
          name: nameEn || nameAr,
          type: 'error',
          message: 'سعر المقارنة يجب أن يكون رقماً أكبر من أو يساوي صفر',
        });
      } else {
        comparePrice = compPrice;
        if (!isNaN(price) && compPrice <= price) {
          groupWarnings.push({
            row: group.firstRowNum,
            sku: group.sku,
            name: nameEn || nameAr,
            type: 'warning',
            message: 'سعر المقارنة أقل من أو يساوي سعر البيع',
          });
        }
      }
    }

    let statusRaw = getVal(pRow, 'status').toLowerCase();
    if (statusRaw === '') statusRaw = 'active';
    let status: 'active' | 'draft' = 'active';
    if (statusRaw !== 'active' && statusRaw !== 'draft') {
      groupHasError = true;
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        name: nameEn || nameAr,
        type: 'error',
        message: "الحالة يجب أن تكون 'active' أو 'draft'",
      });
    } else {
      status = statusRaw;
    }

    const categoryVal = getVal(pRow, 'category').toLowerCase();
    let categoryId: string | undefined = undefined;
    if (categoryVal) {
      categoryId = categoryMap.get(categoryVal);
      if (!categoryId) {
        groupHasError = true;
        errors.push({
          row: group.firstRowNum,
          sku: group.sku,
          name: nameEn || nameAr,
          type: 'error',
          message: `الفئة المحددة (${categoryVal}) غير موجودة`,
        });
      }
    } else if (defaultCategoryId) {
      categoryId = defaultCategoryId;
    } else {
      groupHasError = true;
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        name: nameEn || nameAr,
        type: 'error',
        message: 'لا توجد فئة محددة',
      });
    }

    const tagsRaw = getVal(pRow, 'tags');
    const tags: string[] = [];
    if (tagsRaw) {
      const rawTagList = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
      if (rawTagList.length > 20) {
        groupWarnings.push({
          row: group.firstRowNum,
          sku: group.sku,
          name: nameEn || nameAr,
          type: 'warning',
          message: 'تم تجاوز الحد الأقصى للوسوم (20 وسماً)، تم تجاهل الوسوم الزائدة',
        });
      }
      const cappedTags = rawTagList.slice(0, 20);
      for (const t of cappedTags) {
        if (t.length > 50) {
          tags.push(t.slice(0, 50));
          groupWarnings.push({
            row: group.firstRowNum,
            sku: group.sku,
            name: nameEn || nameAr,
            type: 'warning',
            message: `تم تقصير الوسم '${t}' لتجاوزه الحد الأقصى (50 حرفاً)`,
          });
        } else {
          tags.push(t);
        }
      }
    }

    const imagesRaw = getVal(pRow, 'images');
    let images: string[] = [];
    if (imagesRaw) {
      const rawImgList = imagesRaw.split(/[,|]/).map(s => s.trim()).filter(Boolean);
      const validImages: string[] = [];
      for (const img of rawImgList) {
        if (/^https?:\/\/.+/i.test(img) || img.startsWith('/uploads/')) {
          validImages.push(img);
        } else {
          groupWarnings.push({
            row: group.firstRowNum,
            sku: group.sku,
            name: nameEn || nameAr,
            type: 'warning',
            message: `رابط صورة غير صالح وتم تجاهله: ${img}`,
          });
        }
      }
      if (validImages.length > 10) {
        groupWarnings.push({
          row: group.firstRowNum,
          sku: group.sku,
          name: nameEn || nameAr,
          type: 'warning',
          message: 'تم تجاوز الحد الأقصى للصور (10 صور)، تم تجاهل الصور الزائدة',
        });
      }
      images = validImages.slice(0, 10);
    }

    const description = {
      en: sanitizeDescriptionHtml(getVal(pRow, 'description (en)') || ''),
      ar: sanitizeDescriptionHtml(getVal(pRow, 'description (ar)') || ''),
    };

    // 8. Variant rows
    const variants: ParsedVariant[] = [];
    for (const r of group.rows) {
      const variantOptionsRaw = getVal(r.row, 'variant options');
      const isVariant = variantOptionsRaw !== '';
      const isProductRow = r.rowNum === productRowEntry.rowNum;

      if (!isVariant && !isProductRow) {
        groupWarnings.push({
          row: r.rowNum,
          sku: group.sku,
          name: nameEn || nameAr,
          type: 'warning',
          message: 'صف إضافي تم تجاهله',
        });
        continue;
      }

      if (isVariant) {
        const pairs = variantOptionsRaw.split(',').map(p => p.trim()).filter(Boolean);
        const options: Record<string, string> = {};
        let optionsError = false;

        if (pairs.length === 0) {
          optionsError = true;
        }

        for (const pair of pairs) {
          const colonIdx = pair.indexOf(':');
          if (colonIdx === -1) {
            optionsError = true;
            break;
          }
          const key = pair.slice(0, colonIdx).trim();
          const val = pair.slice(colonIdx + 1).trim();
          if (!key || !val) {
            optionsError = true;
            break;
          }
          options[key] = val;
        }

        if (optionsError || Object.keys(options).length === 0) {
          groupHasError = true;
          errors.push({
            row: r.rowNum,
            sku: group.sku,
            name: nameEn || nameAr,
            type: 'error',
            message: 'صيغة خيارات المتغير غير صالحة (الصيغة الصحيحة: key:value,key:value)',
          });
          continue;
        }

        const vPriceRaw = getVal(r.row, 'variant price');
        const vPrice = Number(vPriceRaw);
        if (vPriceRaw === '' || isNaN(vPrice) || vPrice <= 0) {
          groupHasError = true;
          errors.push({
            row: r.rowNum,
            sku: group.sku,
            name: nameEn || nameAr,
            type: 'error',
            message: 'سعر المتغير مطلوب ويجب أن يكون رقماً أكبر من صفر',
          });
        }

        const vStockRaw = getVal(r.row, 'variant stock');
        const vStock = Number(vStockRaw);
        if (
          vStockRaw === '' ||
          isNaN(vStock) ||
          !Number.isInteger(vStock) ||
          vStock < 0
        ) {
          groupHasError = true;
          errors.push({
            row: r.rowNum,
            sku: group.sku,
            name: nameEn || nameAr,
            type: 'error',
            message: 'مخزون المتغير مطلوب ويجب أن يكون رقماً صحيحاً 0 أو أكثر',
          });
        }

        const vNameRaw = getVal(r.row, 'variant name');
        const vName = vNameRaw || deriveVariantName({ options });

        const vSkuRaw = getVal(r.row, 'variant sku');
        const vSku = vSkuRaw || undefined;

        if (vSku) {
          const vSkuKey = vSku.toLowerCase();
          if (seenFileVariantSkus.has(vSkuKey)) {
            groupHasError = true;
            errors.push({
              row: r.rowNum,
              sku: vSku,
              name: nameEn || nameAr,
              type: 'error',
              message: `رمز SKU للمتغير (${vSku}) مكرر في الملف`,
            });
          } else {
            seenFileVariantSkus.set(vSkuKey, r.rowNum);
          }
        }

        const vComparePriceRaw = getVal(r.row, 'variant compare price');
        let vComparePrice: number | undefined = undefined;
        if (vComparePriceRaw !== '') {
          const vCompNum = Number(vComparePriceRaw);
          if (isNaN(vCompNum) || vCompNum < 0) {
            groupHasError = true;
            errors.push({
              row: r.rowNum,
              sku: group.sku,
              name: nameEn || nameAr,
              type: 'error',
              message: 'سعر المقارنة للمتغير يجب أن يكون رقماً أكبر من أو يساوي صفر',
            });
          } else {
            vComparePrice = vCompNum;
          }
        }

        const vImageRaw = getVal(r.row, 'variant image');
        let vImageUrl: string | undefined = undefined;
        if (vImageRaw !== '') {
          if (/^https?:\/\/.+/i.test(vImageRaw) || vImageRaw.startsWith('/uploads/')) {
            vImageUrl = vImageRaw;
          } else {
            groupWarnings.push({
              row: r.rowNum,
              sku: group.sku,
              name: nameEn || nameAr,
              type: 'warning',
              message: `تم تجاهل رابط صورة المتغير غير الصالح: ${vImageRaw}`,
            });
          }
        }

        variants.push({
          options,
          name: vName,
          price: vPrice,
          comparePrice: vComparePrice,
          sku: vSku,
          stockQuantity: vStock,
          imageUrl: vImageUrl,
          rowNum: r.rowNum,
        });
      }
    }

    errors.push(...groupWarnings);

    if (!groupHasError && categoryId) {
      candidateGroups.push({
        sku: group.sku,
        name: { en: nameEn, ar: nameAr },
        description,
        price,
        comparePrice,
        stockQuantity,
        status,
        categoryId,
        tags,
        images,
        variants,
        firstRowNum: group.firstRowNum,
        warnings: groupWarnings,
      });
    }
  }

  // 9 (b). Check duplicate SKUs in database
  const allProductSkus = Array.from(new Set(candidateGroups.map(g => g.sku)));
  const allVariantSkus = Array.from(
    new Set(
      candidateGroups
        .flatMap(g => g.variants.map(v => v.sku))
        .filter((sku): sku is string => Boolean(sku))
    )
  );

  const [existingProducts, existingVariants] = await Promise.all([
    allProductSkus.length > 0
      ? prisma.product.findMany({
          where: { sku: { in: allProductSkus } },
          select: { sku: true },
        })
      : [],
    allVariantSkus.length > 0
      ? prisma.productVariant.findMany({
          where: { sku: { in: allVariantSkus }, deletedAt: null },
          select: { sku: true },
        })
      : [],
  ]);

  const existingProductSkusSet = new Set(
    existingProducts
      .flatMap(p => [p.sku, p.sku?.trim().toLowerCase()])
      .filter((sku): sku is string => Boolean(sku))
  );
  const existingVariantSkusSet = new Set(
    existingVariants
      .flatMap(v => [v.sku, v.sku?.trim().toLowerCase()])
      .filter((sku): sku is string => Boolean(sku))
  );

  const validGroups: ParsedProductGroup[] = [];
  let skippedCount = 0;

  for (const group of candidateGroups) {
    const isProductSkuExisting =
      existingProductSkusSet.has(group.sku) ||
      existingProductSkusSet.has(group.sku.trim().toLowerCase());

    const isAnyVariantSkuExisting = group.variants.some(
      v =>
        v.sku &&
        (existingVariantSkusSet.has(v.sku) ||
          existingVariantSkusSet.has(v.sku.trim().toLowerCase()))
    );

    if (isProductSkuExisting || isAnyVariantSkuExisting) {
      skippedCount++;
      errors.push({
        row: group.firstRowNum,
        sku: group.sku,
        name: group.name.en || group.name.ar,
        type: 'skipped',
        message: 'منتج موجود بالفعل بنفس SKU',
      });
    } else {
      validGroups.push(group);
    }
  }

  errors.sort((a, b) => a.row - b.row);
  const errorCount = errors.filter(e => e.type === 'error').length;

  return {
    validGroups,
    errors,
    stats: {
      totalFileRows: rows.length,
      totalGroups: groupsMap.size,
      validCount: validGroups.length,
      skippedCount,
      errorCount,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// downloadExternalImage — fetch, optimize with sharp, and save locally
// ─────────────────────────────────────────────────────────────────────────────

// Blocks loopback/private/link-local hosts so imported image URLs can't be used
// to probe internal services from the server.
const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    return true;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0 || a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  // IPv6 literals — block ::1, fc00::/7, fe80::/10 and IPv4-mapped ranges
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
    if (host.startsWith('::ffff:')) return isPrivateHost(host.slice(7));
  }
  return false;
};

const downloadExternalImage = async (rawUrl: string): Promise<string | null> => {
  try {
    // Follow redirects manually so every hop is re-checked against private hosts
    let currentUrl = rawUrl;
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      const parsedUrl = new URL(currentUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return null;
      if (isPrivateHost(parsedUrl.hostname)) return null;

      res = await fetch(currentUrl, { signal: AbortSignal.timeout(10000), redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }
    if (!res || !res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const targetDir = path.join(uploadDir, 'products');
    await fs.mkdir(targetDir, { recursive: true });

    const filename = `import-${randomUUID()}.webp`;
    const optimizedBuffer = await sharp(inputBuffer)
      .resize({ width: 2000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await fs.writeFile(path.join(targetDir, filename), optimizedBuffer);
    return `/uploads/products/${filename}`;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// processImportJob — background processor (never throws)
// ─────────────────────────────────────────────────────────────────────────────
const processImportJob = async (
  jobId: string,
  groups: ParsedProductGroup[],
  downloadImages: boolean
): Promise<void> => {
  try {
    const job = await prisma.productImportJob.findUnique({
      where: { id: jobId },
    });
    if (!job) return;

    const vendorId = job.vendorId;
    const collectedErrors: ImportJobError[] = Array.isArray(job.errors)
      ? (job.errors as unknown as ImportJobError[])
      : [];

    let successCount = job.successCount || 0;
    let errorCount = job.errorCount || 0;
    let done = 0;

    for (const group of groups) {
      try {
        let productImages = [...group.images];
        if (downloadImages && productImages.some(img => /^https?:\/\//i.test(img))) {
          const CONCURRENCY = 5;
          for (let i = 0; i < productImages.length; i += CONCURRENCY) {
            const batch = productImages.slice(i, i + CONCURRENCY);
            await Promise.all(
              batch.map(async (url, idx) => {
                const targetIdx = i + idx;
                if (/^https?:\/\//i.test(url)) {
                  const downloaded = await downloadExternalImage(url);
                  if (downloaded) {
                    productImages[targetIdx] = downloaded;
                  } else {
                    collectedErrors.push({
                      row: group.firstRowNum,
                      sku: group.sku,
                      name: group.name.en || group.name.ar,
                      type: 'warning',
                      message: `فشل تحميل الصورة الخارجية (${url})، تم الاحتفاظ بالرابط الأصلي`,
                    });
                  }
                }
              })
            );
          }
        }

        if (downloadImages) {
          for (const v of group.variants) {
            if (v.imageUrl && /^https?:\/\//i.test(v.imageUrl)) {
              const downloaded = await downloadExternalImage(v.imageUrl);
              if (downloaded) {
                v.imageUrl = downloaded;
              } else {
                collectedErrors.push({
                  row: v.rowNum,
                  sku: v.sku || group.sku,
                  name: group.name.en || group.name.ar,
                  type: 'warning',
                  message: `فشل تحميل صورة المتغير الخارجية (${v.imageUrl})، تم الاحتفاظ بالرابط الأصلي`,
                });
              }
            }
          }
        }

        const slug = await generateUniqueSlug(group.name.en, 'product');

        const product = await prisma.product.create({
          data: {
            vendorId,
            categoryId: group.categoryId,
            name: group.name,
            description: group.description,
            price: group.price,
            comparePrice: group.comparePrice,
            stockQuantity: group.stockQuantity,
            sku: group.sku,
            slug,
            status: group.status as ProductStatus,
            images: productImages.length
              ? {
                  create: normalizeImages(
                    productImages.map((url, i) => ({
                      url,
                      altText: group.name.en.slice(0, 100),
                      isPrimary: i === 0,
                      sortOrder: i,
                    }))
                  ),
                }
              : undefined,
            variants: group.variants.length
              ? {
                  create: group.variants.map(v => ({
                    name: v.name,
                    options: v.options,
                    price: v.price,
                    comparePrice: v.comparePrice,
                    sku: v.sku || undefined,
                    stockQuantity: v.stockQuantity,
                    imageUrl: v.imageUrl,
                    isActive: true,
                  })),
                }
              : undefined,
            tags: group.tags.length
              ? {
                  create: group.tags.map(t => ({ tag: t })),
                }
              : undefined,
          },
        });

        if (group.variants.length > 0) {
          await syncProductAggregates(product.id);
        }

        successCount++;
      } catch (err: any) {
        let message = err?.message || 'فشل غير متوقع أثناء إنشاء المنتج';
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const target = Array.isArray(err.meta?.target)
            ? (err.meta?.target as string[]).join(', ')
            : 'حقل مكرر';
          message = `تعارض في قيمة فريدة مكررة (${target})`;
        }
        collectedErrors.push({
          row: group.firstRowNum,
          sku: group.sku,
          name: group.name.en || group.name.ar,
          type: 'error',
          message,
        });
        errorCount++;
      }

      done++;
      if (done % 50 === 0) {
        await prisma.productImportJob.update({
          where: { id: jobId },
          data: {
            processedRows: done,
            successCount,
            errorCount,
            errors: collectedErrors.slice(0, 500) as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }

    await prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processedRows: groups.length,
        successCount,
        errorCount,
        errors: collectedErrors.slice(0, 500) as unknown as Prisma.InputJsonValue,
      },
    });

    void revalidateFrontendPaths(['/sitemap.xml', '/products', '/en/products']).catch(() => {});
  } catch (err: any) {
    try {
      const currentJob = await prisma.productImportJob.findUnique({
        where: { id: jobId },
        select: { errors: true },
      });
      const previous = Array.isArray(currentJob?.errors)
        ? (currentJob!.errors as unknown as ImportJobError[])
        : [];
      const updatedErrors = [
        ...previous,
        {
          row: 0,
          type: 'error' as const,
          message: 'فشل غير متوقع: ' + (err?.message || String(err)),
        },
      ].slice(0, 500);

      await prisma.productImportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errors: updatedErrors as unknown as Prisma.InputJsonValue,
        },
      });
    } catch {
      // processImportJob itself must never throw
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// createImportJob — validates vendor/category, parses file, creates job, kicks off worker
// ─────────────────────────────────────────────────────────────────────────────
export const createImportJob = async (opts: {
  fileBuffer: Buffer;
  fileName: string;
  vendorId: string;
  defaultCategoryId?: string | null;
  downloadImages: boolean;
  createdById: string;
}) => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: { id: opts.vendorId, status: 'approved' },
  });
  if (!vendor) {
    throw ApiError.notFound('البائع غير موجود أو غير معتمد');
  }

  if (opts.defaultCategoryId) {
    const category = await prisma.category.findFirst({
      where: { id: opts.defaultCategoryId, isActive: true, deletedAt: null },
    });
    if (!category) {
      throw ApiError.notFound('الفئة الافتراضية غير موجودة أو غير نشطة');
    }
  }

  const parsed = await parseAndValidate(opts.fileBuffer, opts.defaultCategoryId);

  const job = await prisma.productImportJob.create({
    data: {
      fileName: opts.fileName,
      status: 'processing',
      totalRows: parsed.validGroups.length,
      processedRows: 0,
      successCount: 0,
      skippedCount: parsed.stats.skippedCount,
      errorCount: parsed.stats.errorCount,
      errors: parsed.errors.slice(0, 500) as unknown as Prisma.InputJsonValue,
      vendorId: opts.vendorId,
      defaultCategoryId: opts.defaultCategoryId ?? null,
      createdById: opts.createdById,
    },
  });

  void processImportJob(job.id, parsed.validGroups, opts.downloadImages).catch(() => {});

  return job;
};

// ─────────────────────────────────────────────────────────────────────────────
// getImportJob — gets job details with stale timeout guard
// ─────────────────────────────────────────────────────────────────────────────
export const getImportJob = async (jobId: string) => {
  let job = await prisma.productImportJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw ApiError.notFound('مهمة الاستيراد غير موجودة');
  }

  const STALE_MS = 10 * 60 * 1000;
  const isStale =
    (job.status === 'processing' || job.status === 'validating' || job.status === 'pending') &&
    Date.now() - job.updatedAt.getTime() > STALE_MS;

  if (isStale) {
    const existingErrors = Array.isArray(job.errors)
      ? (job.errors as unknown as ImportJobError[])
      : [];
    const updatedErrors = [
      ...existingErrors,
      {
        row: 0,
        type: 'error' as const,
        message: 'انقطاع غير متوقع أثناء المعالجة',
      },
    ].slice(0, 500);

    job = await prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorCount: job.errorCount + 1,
        errors: updatedErrors as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return (await attachVendorNames([job]))[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// listImportJobs — paginates import jobs (excluding large errors json)
// ─────────────────────────────────────────────────────────────────────────────

// Jobs store a plain vendorId string (no relation), so resolve display names
// separately for the history table in the admin UI.
const attachVendorNames = async <
  T extends { vendorId: string },
>(
  items: T[]
): Promise<(T & { vendorName: string | null })[]> => {
  const vendorIds = Array.from(new Set(items.map(i => i.vendorId)));
  if (vendorIds.length === 0) return items.map(i => ({ ...i, vendorName: null }));
  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, storeName: true },
  });
  const nameById = new Map(
    vendors.map(v => {
      const sn = v.storeName as { en?: string; ar?: string } | null;
      return [v.id, (sn?.ar || sn?.en) ?? null];
    })
  );
  return items.map(i => ({ ...i, vendorName: nameById.get(i.vendorId) ?? null }));
};

export const listImportJobs = async (query: { page?: number; limit?: number } = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.productImportJob.count(),
    prisma.productImportJob.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        status: true,
        totalRows: true,
        processedRows: true,
        successCount: true,
        skippedCount: true,
        errorCount: true,
        vendorId: true,
        defaultCategoryId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items: await attachVendorNames(items),
    meta: buildPaginationMeta(total, page, limit),
  };
};
