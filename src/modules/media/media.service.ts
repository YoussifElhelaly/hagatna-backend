import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import { uploadSingle, deleteFile, UploadFolder } from '@modules/upload/upload.service';
import { ROLES } from '@shared/constants/roles';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ListAssetsQuery {
  page?: string;
  limit?: string;
  folder?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve vendorId for the current user (null if admin) */
async function resolveVendorId(userId: string, role: string): Promise<string | null> {
  if (role === ROLES.ADMIN) return null;

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');
  return vendor.id;
}

// ─── listAssets ───────────────────────────────────────────────────────────────
/**
 * Admin sees all assets.
 * Vendor sees only assets they uploaded (vendorId matches their profile).
 */
export const listAssets = async (
  userId: string,
  role: string,
  query: ListAssetsQuery,
) => {
  const page  = Math.max(1, parseInt(query.page  ?? '1',  10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const skip  = (page - 1) * limit;

  const vendorId = await resolveVendorId(userId, role);

  const where = {
    ...(vendorId !== null ? { vendorId } : {}),
    ...(query.folder ? { folder: query.folder } : {}),
  };

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id:           true,
        url:          true,
        publicId:     true,
        filename:     true,
        folder:       true,
        resourceType: true,
        createdAt:    true,
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        vendor: {
          select: { id: true, storeName: true },
        },
      },
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return { assets, meta: buildPaginationMeta(total, page, limit) };
};

// ─── uploadAsset ──────────────────────────────────────────────────────────────
export const uploadAsset = async (
  userId: string,
  role: string,
  file: Express.Multer.File,
  folder: UploadFolder,
) => {
  const vendorId = await resolveVendorId(userId, role);

  const { url, publicId } = await uploadSingle(file, folder);

  const asset = await prisma.mediaAsset.create({
    data: {
      url,
      publicId,
      filename:     file.originalname,
      folder,
      resourceType: 'image',
      uploadedById: userId,
      vendorId,
    },
    select: {
      id:           true,
      url:          true,
      publicId:     true,
      filename:     true,
      folder:       true,
      resourceType: true,
      createdAt:    true,
    },
  });

  return asset;
};

// ─── deleteAsset ──────────────────────────────────────────────────────────────
export const deleteAsset = async (
  userId: string,
  role: string,
  assetId: string,
) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw ApiError.notFound('Asset not found');

  // Vendors can only delete their own assets
  if (role !== ROLES.ADMIN) {
    const vendorId = await resolveVendorId(userId, role);
    if (asset.vendorId !== vendorId) {
      throw ApiError.forbidden('You do not have permission to delete this asset');
    }
  }

  // Delete from Cloudinary
  await deleteFile(asset.publicId, asset.resourceType === 'raw' ? 'raw' : 'image')
    .catch(() => {/* already deleted on Cloudinary — still remove from DB */});

  await prisma.mediaAsset.delete({ where: { id: assetId } });
};
