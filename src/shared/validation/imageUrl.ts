import { z } from 'zod';

/**
 * Uploads are stored as site-relative paths ("/uploads/products/x.webp") by
 * upload.service, while products migrated from the legacy site still hold
 * absolute hagatnaa.com URLs. Both must validate.
 */
const isRelativeUploadPath = (v: string): boolean => v.startsWith('/uploads/');
const isAbsoluteHttpUrl = (v: string): boolean => {
  const parsed = z.string().url().safeParse(v);
  if (!parsed.success) return false;
  return /^https?:$/.test(new URL(v).protocol);
};

export const imageUrlSchema = (message = 'Invalid image URL') =>
  z
    .string()
    .min(1, message)
    .max(2048, 'Image URL is too long')
    .refine((v) => isRelativeUploadPath(v) || isAbsoluteHttpUrl(v), {
      message: `${message}. Must be an /uploads/... path or an absolute http(s) URL`,
    });
