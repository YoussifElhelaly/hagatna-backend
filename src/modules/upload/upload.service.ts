import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { ApiError } from '@shared/utils/ApiError';

// ─── Folder map ───────────────────────────────────────────────────────────────
export type UploadFolder =
  | 'avatars'
  | 'products'
  | 'vendors/logos'
  | 'vendors/banners'
  | 'banners'
  | 'categories'
  | 'reviews'
  | 'documents'
  | 'payouts';

// ─── Config ───────────────────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_IMAGE_WIDTH = 2000;
const WEBP_QUALITY = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getExt(mimetype: string, originalname: string): string {
  if (mimetype === 'application/pdf') return '.pdf';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/gif') return '.gif';
  // Default: use original extension or .jpg
  const orig = path.extname(originalname).toLowerCase();
  return orig || '.jpg';
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildUrl(folder: string, filename: string): string {
  return `/uploads/${folder}/${filename}`;
}

// ─── uploadSingle ─────────────────────────────────────────────────────────────
export const uploadSingle = async (
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<{ url: string; publicId: string }> => {
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';

  if (!isImage && !isPdf) {
    throw new ApiError(400, `Unsupported file type: ${file.mimetype}`);
  }

  const dir = path.join(UPLOAD_DIR, folder);
  await ensureDir(dir);

  const id = randomUUID();
  let filename: string;
  let buffer: Buffer;

  if (isPdf) {
    filename = `${id}.pdf`;
    buffer = file.buffer;
  } else {
    // Optimize image with sharp
    filename = `${id}.webp`;
    buffer = await sharp(file.buffer)
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  }

  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  const url = buildUrl(folder, filename);
  const publicId = `${folder}/${filename}`;

  return { url, publicId };
};

// ─── uploadMultiple ───────────────────────────────────────────────────────────
export const uploadMultiple = async (
  files: Express.Multer.File[],
  folder: UploadFolder,
): Promise<Array<{ url: string; publicId: string }>> =>
  Promise.all(files.map((f) => uploadSingle(f, folder)));

// ─── deleteFile ───────────────────────────────────────────────────────────────
export const deleteFile = async (
  publicId: string,
  _resourceType: 'image' | 'raw' = 'image',
): Promise<void> => {
  const filePath = path.join(UPLOAD_DIR, publicId);
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err.code === 'ENOENT') return; // already deleted — ok
    throw new ApiError(500, `Failed to delete file: ${err.message}`);
  }
};

// ─── deleteMultiple ───────────────────────────────────────────────────────────
export const deleteMultiple = async (publicIds: string[]): Promise<void> => {
  if (!publicIds.length) return;
  await Promise.all(publicIds.map((id) => deleteFile(id)));
};
