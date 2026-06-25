import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
} from './wishlist.controller';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

// GET    /api/v1/wishlist                  → paginated wishlist
// DELETE /api/v1/wishlist                  → clear entire wishlist
router.get ('/', getWishlist);
router.delete('/', clearWishlist);

// POST   /api/v1/wishlist/check            → batch check { productIds[] }
// Must be declared BEFORE /:productId to avoid route collision
router.post('/check', checkWishlist);

// POST   /api/v1/wishlist/:productId       → toggle (add / remove)
// DELETE /api/v1/wishlist/:productId       → explicit remove
router.post  ('/:productId', toggleWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
