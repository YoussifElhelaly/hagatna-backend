import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import * as NewsletterService from './newsletter.service';

// ─── POST /newsletter/subscribe  (public) ─────────────────────────────────────
export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const data = await NewsletterService.subscribe(req.body.email);
  sendSuccess({ res, message: 'Subscribed to the newsletter', data });
});
