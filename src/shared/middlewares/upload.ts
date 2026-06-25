import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ApiError } from '@shared/utils/ApiError';

// ─── Allowed MIME types ───────────────────────────────────────────────────────
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_MIME_TYPES = ['application/pdf'];
const ALL_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES];

// ─── File size limits ──────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE  = 5  * 1024 * 1024; //  5 MB
const MAX_DOC_SIZE    = 10 * 1024 * 1024; // 10 MB

// ─── Memory storage (buffer → Cloudinary stream) ─────────────────────────────
const memoryStorage = multer.memoryStorage();

// ─── Filter factory ───────────────────────────────────────────────────────────
const makeFilter =
  (allowed: string[]) =>
  (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`));
    }
  };

// ─── Exported multer instances ────────────────────────────────────────────────

/** Single image upload — field name: "image" */
export const uploadImage = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: makeFilter(IMAGE_MIME_TYPES),
}).single('image');

/** Multiple images — field name: "images", max 10 */
export const uploadImages = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: makeFilter(IMAGE_MIME_TYPES),
}).array('images', 10);

/** Single document (PDF) — field name: "document" */
export const uploadDocument = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: makeFilter(DOCUMENT_MIME_TYPES),
}).single('document');

/** Mixed: up to 10 images + 1 document */
export const uploadMixed = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: makeFilter(ALL_MIME_TYPES),
}).fields([
  { name: 'images',   maxCount: 10 },
  { name: 'document', maxCount: 1  },
]);
