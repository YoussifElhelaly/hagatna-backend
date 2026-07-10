import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ApiError } from '@shared/utils/ApiError';
import * as MediaService from './media.service';
import { isUploadFolder, UPLOAD_FOLDERS } from '@modules/upload/upload.service';

// Folders reachable through the media library. `payouts` and `documents` are
// written by their own flows and must not be targetable from here.
const MEDIA_FOLDERS: readonly string[] = UPLOAD_FOLDERS.filter(
  (f) => f !== 'payouts' && f !== 'documents',
);

// ─── GET /media ────────────────────────────────────────────────────────────────
export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const { assets, meta } = await MediaService.listAssets(
    req.user!.id,
    req.user!.role,
    req.query as never,
  );
  sendSuccess({ res, message: 'Media assets retrieved', data: assets, meta });
});

// ─── POST /media ───────────────────────────────────────────────────────────────
export const uploadAsset = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'Image file is required');

  const folder = (req.body.folder as string) || 'products';
  if (!isUploadFolder(folder) || !MEDIA_FOLDERS.includes(folder)) {
    throw new ApiError(400, `Invalid folder. Allowed: ${MEDIA_FOLDERS.join(', ')}`);
  }

  const asset = await MediaService.uploadAsset(
    req.user!.id,
    req.user!.role,
    req.file,
    folder,
  );
  sendCreated(res, 'Asset uploaded successfully', asset);
});

// ─── DELETE /media/:id ─────────────────────────────────────────────────────────
export const deleteAsset = asyncHandler(async (req: Request, res: Response) => {
  await MediaService.deleteAsset(req.user!.id, req.user!.role, req.params.id);
  sendSuccess({ res, message: 'Asset deleted successfully', data: null });
});
