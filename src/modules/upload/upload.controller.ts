import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ApiError } from '@shared/utils/ApiError';
import * as uploadService from './upload.service';
import type { UploadFolder } from './upload.service';

// ─── Allowed folders from query param ────────────────────────────────────────
const ALLOWED_FOLDERS: UploadFolder[] = [
  'avatars',
  'products',
  'vendors/logos',
  'vendors/banners',
  'banners',
  'categories',
  'reviews',
  'documents',
];

const ADMIN_ONLY_FOLDERS: UploadFolder[] = ['banners', 'categories', 'documents'];
const VENDOR_ADMIN_FOLDERS: UploadFolder[] = ['products', 'vendors/logos', 'vendors/banners'];

const resolveFolder = (req: Request): UploadFolder => {
  const folder = (req.query.folder as string) ?? 'products';
  if (!ALLOWED_FOLDERS.includes(folder as UploadFolder)) {
    throw new ApiError(400, `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(', ')}`);
  }
  const role = (req as any).user?.role as string | undefined;
  if (ADMIN_ONLY_FOLDERS.includes(folder as UploadFolder) && role !== 'admin') {
    throw new ApiError(403, 'Only admins can upload to this folder');
  }
  if (VENDOR_ADMIN_FOLDERS.includes(folder as UploadFolder) && role !== 'admin' && role !== 'vendor') {
    throw new ApiError(403, 'Only vendors and admins can upload to this folder');
  }
  return folder as UploadFolder;
};

// ─── POST /upload/image ───────────────────────────────────────────────────────
// Uploads a single image. Pass ?folder=products (default) or any allowed folder.
export const uploadImageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'No image file provided. Use field name "image".');
  const folder = resolveFolder(req);
  const result = await uploadService.uploadSingle(req.file, folder);
  return sendCreated(res, 'Image uploaded successfully', result);
});

// ─── POST /upload/images ──────────────────────────────────────────────────────
// Uploads multiple images (max 10). Pass ?folder=products.
export const uploadImagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) throw new ApiError(400, 'No image files provided. Use field name "images".');
  const folder = resolveFolder(req);
  const results = await uploadService.uploadMultiple(files, folder);
  return sendCreated(res, `${results.length} image(s) uploaded successfully`, { files: results });
});

// ─── DELETE /upload ───────────────────────────────────────────────────────────
// Deletes a file by publicId. Body: { publicId, resourceType? }
export const deleteFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const { publicId, resourceType } = req.body as {
    publicId?: string;
    resourceType?: 'image' | 'raw';
  };
  if (!publicId) throw new ApiError(400, 'publicId is required');
  await uploadService.deleteFile(publicId, resourceType ?? 'image');
  return sendSuccess({ res, message: 'File deleted successfully' });
});

// ─── DELETE /upload/bulk ──────────────────────────────────────────────────────
// Deletes multiple files. Body: { publicIds: string[] }
export const deleteFilesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { publicIds } = req.body as { publicIds?: string[] };
  if (!publicIds?.length) throw new ApiError(400, 'publicIds array is required');
  if (publicIds.length > 100) throw new ApiError(400, 'Maximum 100 files per bulk delete');
  await uploadService.deleteMultiple(publicIds);
  return sendSuccess({ res, message: `${publicIds.length} file(s) deleted successfully` });
});
