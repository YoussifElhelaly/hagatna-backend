import { Router } from 'express';
import * as StatsController from './stats.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// GET /api/v1/stats
router.get('/', StatsController.getStats);

export default router;
