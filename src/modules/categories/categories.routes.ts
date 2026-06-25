import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryIdParamSchema,
  CategorySlugParamSchema,
} from './categories.validation';
import * as CategoriesController from './categories.controller';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

// GET  /api/v1/categories
// Returns the full active category tree (2 levels deep), Redis-cached 1 hour
router.get('/', CategoriesController.listCategories);

// GET  /api/v1/categories/:slug
// Single category with parent, children, and active product count
// NOTE: declared before /:id admin routes — no conflict since slug uses string and id uses uuid validation
router.get(
  '/:slug',
  validate({ params: CategorySlugParamSchema }),
  CategoriesController.getCategoryBySlug
);

// ─── Admin Only ───────────────────────────────────────────────────────────────

// POST /api/v1/categories
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: CreateCategorySchema }),
  CategoriesController.createCategory
);

// PATCH /api/v1/categories/:id
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: CategoryIdParamSchema, body: UpdateCategorySchema }),
  CategoriesController.updateCategory
);

// DELETE /api/v1/categories/:id
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: CategoryIdParamSchema }),
  CategoriesController.deleteCategory
);

export default router;
