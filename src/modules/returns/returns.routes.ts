import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  requestReturn,
  listMyReturns,
  getMyReturn,
  adminListReturns,
  vendorListReturns,
  approveReturn,
  rejectReturn,
} from './returns.controller';
import {
  requestReturnBody,
  approveReturnBody,
  rejectReturnBody,
} from './returns.validation';

const router = Router();

// ─── All routes require authentication ───────────────────────────────────────
router.use(authenticate);

// ─── Admin routes — MUST be mounted before /:id to avoid route collision ───────
// GET    /api/v1/returns/admin        → list all returns (with filters)
// PATCH  /api/v1/returns/admin/:id/approve
// PATCH  /api/v1/returns/admin/:id/reject
const admin = Router();
admin.use(authorize(ROLES.ADMIN));

admin.get ('/',             adminListReturns);
admin.patch('/:id/approve', validate({ body: approveReturnBody }), approveReturn);
admin.patch('/:id/reject',  validate({ body: rejectReturnBody }),  rejectReturn);

router.use('/admin', admin);

// ─── Vendor routes — MUST be mounted before /:id to avoid route collision ──────
// GET    /api/v1/returns/vendor        → list returns for vendor's orders
const vendor = Router();
vendor.use(authorize(ROLES.VENDOR));

vendor.get('/', vendorListReturns);

router.use('/vendor', vendor);

// ─── Customer routes ──────────────────────────────────────────────────────────
// POST   /api/v1/returns              → request a return
// GET    /api/v1/returns              → list my returns
// GET    /api/v1/returns/:id          → get single return (must be LAST)
router.post('/',    validate({ body: requestReturnBody }), requestReturn);
router.get ('/',    listMyReturns);
router.get ('/:id', getMyReturn);

export default router;
