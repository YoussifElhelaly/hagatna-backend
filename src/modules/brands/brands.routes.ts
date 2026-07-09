import { Router } from 'express';
import * as BrandsController from './brands.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// GET /api/v1/brands
router.get('/', BrandsController.listBrands);

// ─── Admin ───────────────────────────────────────────────────────────
// These should ideally be protected by auth/role middleware in the main router
router.get('/admin', BrandsController.listAllBrandsForAdmin);
router.post('/', BrandsController.createBrand);
router.patch('/:id', BrandsController.updateBrand);
router.delete('/:id', BrandsController.deleteBrand);

export default router;
