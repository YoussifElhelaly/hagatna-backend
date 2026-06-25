import { Request, Response } from 'express';
import * as bannerService from './banners.service';

export async function createBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.createBanner(req.body);
    res.status(201).json({
      success: true,
      data: banner,
      message: 'Banner created successfully',
    });
  } catch (error) {
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner',
    });
  }
}

export async function updateBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.updateBanner(req.params.id, req.body);
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
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
    });
  }
}

export async function deleteBanner(req: Request, res: Response): Promise<void> {
  try {
    await bannerService.deleteBanner(req.params.id);
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
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
    });
  }
}

export async function toggleBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.toggleBannerActive(req.params.id);
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
    res.status(500).json({
      success: false,
      message: 'Failed to toggle banner',
    });
  }
}

export async function reorderBanners(req: Request, res: Response): Promise<void> {
  try {
    await bannerService.reorderBanners(req.body.bannerIds);
    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reorder banners',
    });
  }
}
