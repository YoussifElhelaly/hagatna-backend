import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import * as BlogService from './blog.service';

// ─── Public ───────────────────────────────────────────────────────────────────

// GET /blog
export const listPublished = asyncHandler(async (req: Request, res: Response) => {
  const { posts, meta } = await BlogService.listPublished(req.query as never);
  sendSuccess({ res, message: 'Blog posts retrieved', data: posts, meta });
});

// GET /blog/sitemap
export const getSitemap = asyncHandler(async (_req: Request, res: Response) => {
  const entries = await BlogService.getSitemapEntries();
  sendSuccess({ res, message: 'Blog sitemap retrieved', data: entries });
});

// GET /blog/:slug
export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogService.getPublishedBySlug(req.params.slug);
  sendSuccess({ res, message: 'Blog post retrieved', data: post });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /blog/admin
export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const { posts, meta } = await BlogService.listAll(req.query as never);
  sendSuccess({ res, message: 'Blog posts retrieved', data: posts, meta });
});

// GET /blog/admin/:id
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogService.getById(req.params.id);
  sendSuccess({ res, message: 'Blog post retrieved', data: post });
});

// POST /blog
export const create = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogService.create(req.body);
  sendCreated(res, 'Blog post created', post);
});

// PATCH /blog/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogService.update(req.params.id, req.body);
  sendSuccess({ res, message: 'Blog post updated', data: post });
});

// DELETE /blog/:id
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await BlogService.remove(req.params.id);
  sendSuccess({ res, message: 'Blog post deleted', data: null });
});
