import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreateAttributeDefinitionSchema,
  UpdateAttributeDefinitionSchema,
  SetProductAttributesSchema,
  AttributeDefinitionIdParamSchema,
  CategoryIdQuerySchema,
} from './attributes.validation';
import * as AttributesController from './attributes.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: static paths (/facets, /product) MUST come before /:id
// ─────────────────────────────────────────────────────────────────────────────

// ─── Public ───────────────────────────────────────────────────────────────────

// GET /api/v1/attributes?categoryId=xxx
// Returns all attribute definitions for a category (to build filter UI)
router.get('/', validate({ query: CategoryIdQuerySchema }), AttributesController.listDefinitions);

// GET /api/v1/attributes/facets?categoryId=xxx
// Returns filterable attributes WITH per-value product counts
router.get('/facets', validate({ query: CategoryIdQuerySchema }), AttributesController.getFacets);

// GET /api/v1/attributes/product/:productId
// Returns all attribute values for a specific product
router.get('/product/:productId', AttributesController.getProductAttributes);

// ─── Vendor / Admin — set product attributes ──────────────────────────────────

// PUT /api/v1/attributes/product/:productId
router.put(
  '/product/:productId',
  authenticate,
  authorize(ROLES.VENDOR, ROLES.ADMIN),
  validate({ body: SetProductAttributesSchema }),
  AttributesController.setProductAttributes,
);

// ─── Admin — manage definitions ───────────────────────────────────────────────

// POST /api/v1/attributes
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: CreateAttributeDefinitionSchema }),
  AttributesController.createDefinition,
);

// GET /api/v1/attributes/:id
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: AttributeDefinitionIdParamSchema }),
  AttributesController.getDefinition,
);

// PATCH /api/v1/attributes/:id
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: AttributeDefinitionIdParamSchema, body: UpdateAttributeDefinitionSchema }),
  AttributesController.updateDefinition,
);

// DELETE /api/v1/attributes/:id
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ params: AttributeDefinitionIdParamSchema }),
  AttributesController.deleteDefinition,
);

export default router;
