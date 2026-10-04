import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import * as EarlyRegistrationController from './early-registration.controller';

const router = Router();

router.post('/', EarlyRegistrationController.registerEarly);
router.get('/admin', authenticate, authorize(Role.admin), EarlyRegistrationController.getRegistrations);

export default router;
