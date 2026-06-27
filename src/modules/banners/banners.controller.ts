import { Request, Response } from 'express';
import * as bannerService from './banners.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';
import { logger } from '@shared/utils/logger';

export async function createBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.createBanner(req.body);
    logActivity({
      userId: req.user?.id,
      role: 'admin',
      category: 'settings',
      action: 'create_banner',
      entityType: 'banner',
      entityId: banner.id,
      entityLabel: typeof banner.title === 'object' ? (banner.title as any)?.en || JSON.stringify(banner.title) : String(banner.title || ''),
      metadata: { title: req.body.title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({
      success: true,
      data: banner,
      message: 'Banner created successfully',
    });
  } catch (error) {
    logger.error('Failed to create banner', { error: (error as Error).message, stack: (error as Error).stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
    });
  }
}

export async function getActiveBanners(_req: Request, res: Response): Promise<void> {
  try {
    const banners = await bannerService.getActiveBanners();
    res.status(200).json({
      success: true,
      data: banners,
      total: banners.length,
    });
  } catch (error) {
    logger.error('Failed to fetch active banners', { error: (error as Error).message, stack: (error as Error).stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
}

export async function getAllBanners(_req: Request, res: Response): Promise<void> {
  try {
    const banners = await bannerService.getAllBanners();
    res.status(200).json({
      success: true,
      data: banners,
      total: banners.length,
    });
  } catch (error) {
    logger.error('Failed to fetch all banners', { error: (error as Error).message, stack: (error as Error).stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
}

export async function getBannerById(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.getBannerById(req.params.id);

    if (!banner) {
      res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    logger.error('Failed to fetch banner', { error: (error as Error).message, stack: (error as Error).stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner',
    });
  }
}

export async function updateBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.updateBanner(req.params.id, req.body);
    logActivity({
      userId: req.user?.id,
      role: 'admin',
      category: 'settings',
      action: 'update_banner',
      entityType: 'banner',
      entityId: req.params.id,
      entityLabel: typeof banner.title === 'object' ? (banner.title as any)?.en || JSON.stringify(banner.title) : String(banner.title || ''),
      metadata: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({
      success: true,
      data: banner,
      message: 'Banner updated successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }
    logger.error('Failed to update banner', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
    });
  }
}

export async function deleteBanner(req: Request, res: Response): Promise<void> {
  try {
    await bannerService.deleteBanner(req.params.id);
    logActivity({
      userId: req.user?.id,
      role: 'admin',
      category: 'settings',
      action: 'delete_banner',
      entityType: 'banner',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }
    logger.error('Failed to delete banner', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
    });
  }
}

export async function toggleBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.toggleBannerActive(req.params.id);
    logActivity({
      userId: req.user?.id,
      role: 'admin',
      category: 'settings',
      action: 'toggle_banner',
      entityType: 'banner',
      entityId: req.params.id,
      entityLabel: typeof banner.title === 'object' ? (banner.title as any)?.en || JSON.stringify(banner.title) : String(banner.title || ''),
      metadata: { isActive: banner.isActive },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({
      success: true,
      data: banner,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }
    logger.error('Failed to toggle banner', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to toggle banner',
    });
  }
}

export async function reorderBanners(req: Request, res: Response): Promise<void> {
  try {
    await bannerService.reorderBanners(req.body.bannerIds);
    logActivity({
      userId: req.user?.id,
      role: 'admin',
      category: 'settings',
      action: 'reorder_banners',
      entityType: 'banner',
      metadata: { bannerIds: req.body.bannerIds },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
    });
  } catch (error) {
    logger.error('Failed to reorder banners', { error: (error as Error).message, stack: (error as Error).stack });
    res.status(500).json({
      success: false,
      message: 'Failed to reorder banners',
    });
  }
}
