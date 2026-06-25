import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { uploadImage } from '@shared/middlewares/upload';
import { ROLES } from '@shared/constants/roles';
import * as MediaController from './media.controller';

const router = Router();

// All media routes require authentication.
// Admin and Vendor can access — Customer cannot.
router.use(authenticate, authorize(ROLES.ADMIN, ROLES.VENDOR));

// GET  /api/v1/media          — list assets (admin: all; vendor: own)
router.get('/', MediaController.listAssets);

// POST /api/v1/media          — upload a new asset
// multipart/form-data: field "image", optional body field "folder"
router.post('/', uploadImage, MediaController.uploadAsset);

// DELETE /api/v1/media/:id    — delete an asset
router.delete('/:id', MediaController.deleteAsset);

export default router;
