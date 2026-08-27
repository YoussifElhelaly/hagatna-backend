import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const IMAGES_DIR = process.env.LOCAL_IMAGES_DIR || '/opt/images/products';
const BASE_IMAGE_URL = process.env.BASE_IMAGE_URL || 'https://api.hagatnaa.com/images/products';

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
const delayMs = parseInt(getArgValue('--delay=') || '200', 10);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .substring(0, 100);
}

function getExtensionFromMime(mime: string | null, url: string): string {
  if (mime) {
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('svg')) return 'svg';
    if (mime.includes('avif')) return 'avif';
  }

  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  if (cleanUrl.endsWith('.webp')) return 'webp';
  if (cleanUrl.endsWith('.png')) return 'png';
  if (cleanUrl.endsWith('.jpeg')) return 'jpeg';
  if (cleanUrl.endsWith('.jpg')) return 'jpg';
  if (cleanUrl.endsWith('.gif')) return 'gif';
  if (cleanUrl.endsWith('.avif')) return 'avif';

  return 'jpg';
}

async function downloadImageToFile(url: string, baseSlug: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get('content-type');
    const ext = getExtensionFromMime(contentType, url);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure minimum size (at least 1KB to avoid broken / 1x1 tracking pixels)
    if (buffer.length < 1024) {
      return null;
    }

    const randSuffix = crypto.randomBytes(3).toString('hex');
    const safeSlug = sanitizeFilename(baseSlug) || 'product';
    const fileName = `${safeSlug}-${randSuffix}.${ext}`;
    const filePath = path.join(IMAGES_DIR, fileName);

    fs.writeFileSync(filePath, buffer);
    return fileName;
  } catch {
    return null;
  }
}

interface SerperImageItem {
  imageUrl?: string;
}

async function searchSerperImages(query: string, key: string): Promise<string[]> {
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
        num: 8,
      }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { images?: SerperImageItem[] };
    if (!data.images) return [];

    return data.images
      .map((i) => i.imageUrl)
      .filter((u): u is string => Boolean(u && u.startsWith('http')));
  } catch {
    return [];
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🖼️ Hagatna Image Downloader & Server Localizer          ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📁 Target Directory: ${IMAGES_DIR}`);
  console.log(`🌐 Base URL:         ${BASE_IMAGE_URL}\n`);

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Localize all existing external product images
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────');
  console.log(' STEP 1: Downloading & Localizing existing external images ');
  console.log('───────────────────────────────────────────────────────────');

  const externalImages = await prisma.productImage.findMany({
    where: {
      url: {
        not: {
          startsWith: 'https://api.hagatnaa.com/images/',
        },
      },
    },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`Found ${externalImages.length} external image records to download.\n`);

  let step1Success = 0;
  let step1RemovedBroken = 0;

  for (let i = 0; i < externalImages.length; i++) {
    const img = externalImages[i];
    const slug = img.product?.slug || img.productId;
    const isAlreadyLegacyLocal = img.url.includes('hagatnaa.com/images/');

    if (isAlreadyLegacyLocal) {
      continue;
    }

    console.log(`[${i + 1}/${externalImages.length}] ⬇️ Downloading: ${img.url.substring(0, 70)}...`);

    const fileName = await downloadImageToFile(img.url, slug);

    if (fileName) {
      const localUrl = `${BASE_IMAGE_URL}/${fileName}`;
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: localUrl },
      });
      step1Success++;
      console.log(`      ✅ Saved locally: ${localUrl}`);
    } else {
      console.log(`      ⚠️  Failed to download. Removing broken link to re-fetch via Serper.`);
      await prisma.productImage.delete({
        where: { id: img.id },
      });
      step1RemovedBroken++;
    }

    if (i < externalImages.length - 1) {
      await sleep(100);
    }
  }

  console.log(`\nStep 1 Finished: ${step1Success} downloaded & localized, ${step1RemovedBroken} broken links cleaned.\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Scrape & Download images for products missing images
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────');
  console.log(' STEP 2: Scraping & Downloading for imageless products     ');
  console.log('───────────────────────────────────────────────────────────');

  if (!apiKey) {
    console.log('⚠️  No SERPER_API_KEY provided. Skipping Step 2.');
    return;
  }

  const imagelessProducts = await prisma.product.findMany({
    where: {
      deletedAt: null,
      images: {
        none: {},
      },
    },
    include: {
      brand: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`Found ${imagelessProducts.length} products needing images.\n`);

  let step2Success = 0;
  let step2Failed = 0;

  for (let i = 0; i < imagelessProducts.length; i++) {
    const product = imagelessProducts[i];
    const nameAr = (product.name as any)?.ar || '';
    const nameEn = (product.name as any)?.en || '';
    const brandName = product.brand?.name || '';
    const sku = product.sku || '';

    let query = nameAr || nameEn;
    if (brandName && !query.toLowerCase().includes(brandName.toLowerCase())) {
      query = `${brandName} ${query}`;
    }
    if (sku && !query.includes(sku)) {
      query = `${query} ${sku}`;
    }

    console.log(`[${i + 1}/${imagelessProducts.length}] 🔎 Serper Query: "${query}"`);

    let candidateUrls = await searchSerperImages(query, apiKey);

    if (candidateUrls.length === 0 && nameEn && nameEn !== nameAr) {
      const fallbackQuery = [brandName, nameEn, sku].filter(Boolean).join(' ');
      console.log(`      🔄 Trying fallback query: "${fallbackQuery}"`);
      await sleep(delayMs);
      candidateUrls = await searchSerperImages(fallbackQuery, apiKey);
    }

    let savedFileName: string | null = null;

    // Try candidates until one downloads successfully
    for (const url of candidateUrls) {
      savedFileName = await downloadImageToFile(url, product.slug);
      if (savedFileName) break;
    }

    if (savedFileName) {
      const localUrl = `${BASE_IMAGE_URL}/${savedFileName}`;
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: localUrl,
          altText: nameAr || nameEn || product.slug,
          isPrimary: true,
          sortOrder: 0,
        },
      });
      step2Success++;
      console.log(`      ✅ Downloaded & Saved: ${localUrl}`);
    } else {
      console.log(`      ❌ Could not download any valid image candidate.`);
      step2Failed++;
    }

    if (i < imagelessProducts.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🎉 Complete Pipeline Finished                           ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  📦 Localized Existing Images: ${step1Success}`);
  console.log(`  📸 Newly Scraped & Saved:     ${step2Success}`);
  console.log(`  ⚠️  Products Remaining:        ${step2Failed}\n`);
}

main()
  .catch((e) => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
