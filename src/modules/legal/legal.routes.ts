import { Router } from 'express';
import * as legalController from './legal.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { validate } from '../../shared/middlewares/validate';
import {
  CreateLegalPageSchema,
  UpdateLegalPageSchema,
  UpdateLegalPageBodySchema,
  GetLegalPageSchema,
} from './legal.validation';

const router = Router();

// ─── Public: Get legal page by type + audience ────────────────
router.get(
  '/:type/:audience',
  validate({ params: GetLegalPageSchema }),
  legalController.getPageByTypeAndAudience
);

// ─── Admin only ───────────────────────────────────────────────
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', legalController.getAllPages);

router.get('/:id', legalController.getPageById);

router.post(
  '/',
  validate({ body: CreateLegalPageSchema }),
  legalController.createPage
);

router.put(
  '/:id',
  validate({ params: UpdateLegalPageSchema, body: UpdateLegalPageBodySchema }),
  legalController.updatePage
);

router.delete('/:id', legalController.deletePage);

export default router;
