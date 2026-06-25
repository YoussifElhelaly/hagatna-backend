import { Request, Response } from 'express';
import * as legalService from './legal.service';

export async function createPage(req: Request, res: Response): Promise<void> {
  try {
    const page = await legalService.createLegalPage(req.body);
    res.status(201).json({
      success: true,
      data: page,
      message: 'Legal page created successfully',
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create legal page',
    });
  }
}

export async function getPageByTypeAndAudience(req: Request, res: Response): Promise<void> {
  try {
    const { type, audience } = req.params;
    const page = await legalService.getLegalPage(type, audience);

    if (!page) {
      res.status(404).json({
        success: false,
        message: 'Legal page not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch legal page',
    });
  }
}

export async function getPageById(req: Request, res: Response): Promise<void> {
  try {
    const page = await legalService.getLegalPageById(req.params.id);

    if (!page) {
      res.status(404).json({
        success: false,
        message: 'Legal page not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch legal page',
    });
  }
}

export async function getAllPages(_req: Request, res: Response): Promise<void> {
  try {
    const pages = await legalService.getAllLegalPages();
    res.status(200).json({
      success: true,
      data: pages,
      total: pages.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch legal pages',
    });
  }
}

export async function updatePage(req: Request, res: Response): Promise<void> {
  try {
    const page = await legalService.updateLegalPage(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: page,
      message: 'Legal page updated successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }
    if (error.message.includes('Slug already in use')) {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update legal page',
    });
  }
}

export async function deletePage(req: Request, res: Response): Promise<void> {
  try {
    await legalService.deleteLegalPage(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Legal page deleted successfully',
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
      message: 'Failed to delete legal page',
    });
  }
}
