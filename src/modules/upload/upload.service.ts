import { UploadApiResponse } from 'cloudinary';
import cloudinary from '@config/cloudinary';
import { ApiError } from '@shared/utils/ApiError';

// ─── Folder map ───────────────────────────────────────────────────────────────
export type UploadFolder =
  | 'avatars'
  | 'products'
  | 'vendors/logos'
  | 'vendors/banners'
  | 'categories'
  | 'reviews'
  | 'documents'
  | 'payouts';

// ─── Helper: buffer → Cloudinary upload stream ────────────────────────────────
const streamUpload = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' = 'image',
): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `hagatna/${folder}`,
        resource_type: resourceType,
        // Auto-quality + format for images
        ...(resourceType === 'image' && {
          quality: 'auto',
          fetch_format: 'auto',
        }),
      },
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(500, error?.message ?? 'Cloudinary upload failed'));
        } else {
          resolve(result);
        }
      },
    );
    stream.end(buffer);
  });

// ─── uploadSingle ─────────────────────────────────────────────────────────────
export const uploadSingle = async (
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<{ url: string; publicId: string }> => {
  const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
  const result = await streamUpload(file.buffer, folder, resourceType);
  return { url: result.secure_url, publicId: result.public_id };
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
  resourceType: 'image' | 'raw' = 'image',
): Promise<void> => {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new ApiError(500, `Failed to delete file: ${result.result}`);
  }
};

// ─── deleteMultiple ───────────────────────────────────────────────────────────
export const deleteMultiple = async (publicIds: string[]): Promise<void> => {
  if (!publicIds.length) return;
  await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
};
