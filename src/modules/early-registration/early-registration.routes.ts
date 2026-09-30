import { Router } from 'express';
import * as EarlyRegistrationController from './early-registration.controller';

const router = Router();

router.post('/', EarlyRegistrationController.registerEarly);

export default router;
