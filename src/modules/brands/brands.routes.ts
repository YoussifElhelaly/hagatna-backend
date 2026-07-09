import { Router } from 'express';
import * as BrandsController from './brands.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// GET /api/v1/brands
router.get('/', BrandsController.listBrands);

export default router;
