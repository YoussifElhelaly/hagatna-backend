import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  BlogListQuerySchema,
} from './blog.validation';
import * as BlogController from './blog.controller';

const router = Router();

// ─── Admin (static paths before /:slug) ───────────────────────────────────────
router.get('/admin', authenticate, authorize(ROLES.ADMIN), validate({ query: BlogListQuerySchema }), BlogController.listAll);
router.get('/admin/:id', authenticate, authorize(ROLES.ADMIN), BlogController.getById);
router.post('/', authenticate, authorize(ROLES.ADMIN), validate({ body: CreateBlogPostSchema }), BlogController.create);
router.patch('/:id', authenticate, authorize(ROLES.ADMIN), validate({ body: UpdateBlogPostSchema }), BlogController.update);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), BlogController.remove);

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', validate({ query: BlogListQuerySchema }), BlogController.listPublished);
router.get('/sitemap', BlogController.getSitemap);
router.get('/:slug', BlogController.getBySlug);

export default router;
