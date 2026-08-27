import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// Parse CLI args
const args = process.argv.slice(2);
const getArgValue = (prefix: string) => {
  const arg = args.find((a) => a.startsWith(prefix));
  return arg ? arg.substring(prefix.length) : undefined;
};

const apiKey =
  process.env.SERPER_API_KEY ||
  getArgValue('--key=') ||
  getArgValue('--api-key=');

const limitVal = getArgValue('--limit=');
const limit = limitVal ? parseInt(limitVal, 10) : undefined;

const delayMs = parseInt(getArgValue('--delay=') || '300', 10);
const dryRun = args.includes('--dry-run');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SerperImageResult {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  domain?: string;
}

async function searchImage(query: string, key: string): Promise<string | null> {
  try {
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'eg',
        hl: 'ar',
        num: 5,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`      ❌ Serper HTTP ${res.status}: ${text}`);
      return null;
    }

    const data = (await res.json()) as { images?: SerperImageResult[] };
    if (!data.images || data.images.length === 0) {
      return null;
    }

    // Pick first valid HTTP/HTTPS URL
    for (const item of data.images) {
      if (item.imageUrl && item.imageUrl.startsWith('http')) {
        return item.imageUrl;
      }
    }
    return null;
  } catch (err: any) {
    console.error(`      ❌ Request error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   📸 Hagatna Product Image Scraper (Google Serper API)    ');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!apiKey) {
    console.error('❌ Error: SERPER_API_KEY is required.');
    console.error('Please pass it via:');
    console.error('  1. Environment variable: SERPER_API_KEY="your_key"');
    console.error('  2. Command line flag: --key="your_key"');
    console.error('  3. In /opt/hagatna/.env file as SERPER_API_KEY=your_key\n');
    process.exit(1);
  }

  // Find all non-deleted products without images
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      images: {
        none: {},
      },
    },
    include: {
      brand: true,
      category: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`🔍 Found ${products.length} products with missing images.`);
  if (limit) console.log(`⚙️  Limit set to ${limit} products.`);
  if (dryRun) console.log(`⚠️  DRY RUN mode enabled (no DB changes will be made).\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const nameAr = (product.name as any)?.ar || '';
    const nameEn = (product.name as any)?.en || '';
    const brandName = product.brand?.name || '';
    const sku = product.sku || '';

    // Formulate primary query: Arabic name or English name with SKU/Brand
    let query = nameAr || nameEn;
    if (brandName && !query.toLowerCase().includes(brandName.toLowerCase())) {
      query = `${brandName} ${query}`;
    }
    if (sku && !query.includes(sku)) {
      query = `${query} ${sku}`;
    }

    console.log(`[${i + 1}/${products.length}] 🔎 Searching: "${query}"`);

    let imageUrl = await searchImage(query, apiKey);

    // Fallback search with English name if Arabic didn't return results
    if (!imageUrl && nameEn && nameEn !== nameAr) {
      const fallbackQuery = [brandName, nameEn, sku].filter(Boolean).join(' ');
      console.log(`      🔄 Trying fallback: "${fallbackQuery}"`);
      await sleep(delayMs);
      imageUrl = await searchImage(fallbackQuery, apiKey);
    }

    if (imageUrl) {
      console.log(`      ✅ Found: ${imageUrl}`);
      if (!dryRun) {
        try {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: imageUrl,
              altText: nameAr || nameEn || product.slug,
              isPrimary: true,
              sortOrder: 0,
            },
          });
          successCount++;
        } catch (dbErr: any) {
          console.error(`      ❌ DB Insert Error: ${dbErr.message}`);
          errorCount++;
        }
      } else {
        successCount++;
      }
    } else {
      console.log(`      ⚠️  No image found for this product.`);
      skippedCount++;
    }

    if (i < products.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🏁 Image Scraping Complete                              ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Successfully added: ${successCount}`);
  console.log(`  ⚠️  Skipped (no image found): ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total processed: ${products.length}\n`);
}

main()
  .catch((e) => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
