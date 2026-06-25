import { Router } from 'express';
import { Role } from '@prisma/client';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { SubmitContactSchema, ContactQuerySchema, UpdateContactStatusSchema } from './contact.validation';
import * as ContactController from './contact.controller';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────
router.post('/', validate({ body: SubmitContactSchema }), ContactController.submitContact);

// ─── Admin ───────────────────────────────────────────────────────────
router.get('/admin/stats', authenticate, authorize(Role.admin), ContactController.getStats);
router.get('/admin', authenticate, authorize(Role.admin), validate({ query: ContactQuerySchema }), ContactController.getMessages);
router.get('/admin/:id', authenticate, authorize(Role.admin), ContactController.getMessageById);
router.patch('/admin/:id/status', authenticate, authorize(Role.admin), validate({ body: UpdateContactStatusSchema }), ContactController.updateStatus);
router.delete('/admin/:id', authenticate, authorize(Role.admin), ContactController.deleteMessage);

export default router;
