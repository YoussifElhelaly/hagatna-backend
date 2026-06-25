import { Router } from 'express';
import { sendTestEmail } from './test-email.controller';

const router = Router();

router.post('/', sendTestEmail);

export default router;
