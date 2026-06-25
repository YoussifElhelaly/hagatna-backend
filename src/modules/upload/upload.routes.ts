import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { uploadImage, uploadImages } from '@shared/middlewares/upload';
import {
  uploadImageHandler,
  uploadImagesHandler,
  deleteFileHandler,
  deleteFilesHandler,
} from './upload.controller';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// ─── Single image ──────────────────────────────────────────────────────────────
// POST /api/v1/upload/image?folder=products
// Roles: vendor (for products/reviews), admin (for categories, banners), any auth user (for avatars)
router.post('/image', uploadImage, uploadImageHandler);

// ─── Multiple images ──────────────────────────────────────────────────────────
// POST /api/v1/upload/images?folder=products
router.post('/images', uploadImages, uploadImagesHandler);

// ─── Delete single file ───────────────────────────────────────────────────────
// DELETE /api/v1/upload
// Body: { publicId: string, resourceType?: "image" | "raw" }
// Admin only — vendors must delete through product/review update flows (ownership enforced there)
router.delete('/', authorize('admin'), deleteFileHandler);

// ─── Bulk delete ──────────────────────────────────────────────────────────────
// DELETE /api/v1/upload/bulk
// Body: { publicIds: string[] }
router.delete('/bulk', authorize('admin'), deleteFilesHandler);

export default router;
