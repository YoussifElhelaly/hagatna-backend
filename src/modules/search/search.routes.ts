import { Router } from 'express';
import { validate } from '@shared/middlewares/validate';
import { searchTrackRateLimiter } from '@shared/middlewares/rateLimiter';
import { TrackSearchSchema } from './search.validation';
import * as SearchController from './search.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// POST /api/v1/search/track  — record a committed storefront search
router.post(
  '/track',
  searchTrackRateLimiter,
  validate({ body: TrackSearchSchema }),
  SearchController.trackSearch
);

export default router;
