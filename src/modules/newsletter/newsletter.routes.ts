import { Router } from 'express';
import { validate } from '@shared/middlewares/validate';
import { newsletterRateLimiter } from '@shared/middlewares/rateLimiter';
import { SubscribeNewsletterSchema } from './newsletter.validation';
import * as NewsletterController from './newsletter.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
// POST /api/v1/newsletter/subscribe
router.post(
  '/subscribe',
  newsletterRateLimiter,
  validate({ body: SubscribeNewsletterSchema }),
  NewsletterController.subscribe
);

export default router;
