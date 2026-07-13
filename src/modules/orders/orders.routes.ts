import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { idempotency } from '@shared/middlewares/idempotency';
import { ROLES } from '@shared/constants/roles';
import {
  PlaceOrderSchema,
  QuoteOrderSchema,
  UpdateOrderStatusSchema,
  UpdateItemStatusSchema,
  ReturnRequestSchema,
  ReturnIdParamSchema,
  AdminReturnsQuerySchema,
  OrderNumberParamSchema,
  OrderItemIdParamSchema,
  CustomerOrdersQuerySchema,
  VendorItemsQuerySchema,
  AdminOrdersQuerySchema,
} from './orders.validation';
import * as OrdersController from './orders.controller';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: static prefixes (/vendor, /admin) MUST come before /:orderNumber
// ─────────────────────────────────────────────────────────────────────────────

// ─── Vendor ───────────────────────────────────────────────────────────────────

router.get('/vendor/items', authorize(ROLES.VENDOR), validate({ query: VendorItemsQuerySchema }), OrdersController.getVendorItems);
router.get('/vendor/:orderNumber', authorize(ROLES.VENDOR), validate({ params: OrderNumberParamSchema }), OrdersController.getVendorOrderDetail);
router.patch('/vendor/items/:itemId/status', authorize(ROLES.VENDOR), validate({ params: OrderItemIdParamSchema, body: UpdateItemStatusSchema }), OrdersController.updateItemStatus);

// ─── Admin — Returns (static paths, before /:orderNumber) ────────────────────

// GET  /api/v1/orders/admin/returns
router.get('/admin/returns', authorize(ROLES.ADMIN), validate({ query: AdminReturnsQuerySchema }), OrdersController.listReturns);

// PATCH /api/v1/orders/admin/returns/:returnId/approve
router.patch(
  '/admin/returns/:returnId/approve',
  authorize(ROLES.ADMIN),
  validate({ params: ReturnIdParamSchema }),
  OrdersController.approveReturn
);

// PATCH /api/v1/orders/admin/returns/:returnId/refund
router.patch(
  '/admin/returns/:returnId/refund',
  authorize(ROLES.ADMIN),
  validate({ params: ReturnIdParamSchema }),
  OrdersController.processRefund
);

// ─── Admin — Orders ───────────────────────────────────────────────────────────

// GET  /api/v1/orders/admin
router.get('/admin', authorize(ROLES.ADMIN), validate({ query: AdminOrdersQuerySchema }), OrdersController.listAllOrders);

// GET  /api/v1/orders/admin/:orderNumber  (full detail)
router.get('/admin/:orderNumber', authorize(ROLES.ADMIN), validate({ params: OrderNumberParamSchema }), OrdersController.getAdminOrderDetail);

// PATCH /api/v1/orders/admin/:orderNumber/status
router.patch('/admin/:orderNumber/status', authorize(ROLES.ADMIN), validate({ params: OrderNumberParamSchema, body: UpdateOrderStatusSchema }), OrdersController.updateOrderStatus);

// PATCH /api/v1/orders/admin/:orderNumber/mark-paid  — manually confirm payment (COD / bank transfer)
router.patch('/admin/:orderNumber/mark-paid', authorize(ROLES.ADMIN), validate({ params: OrderNumberParamSchema }), OrdersController.markOrderPaid);

// ─── Customer ─────────────────────────────────────────────────────────────────

// POST /api/v1/orders/quote  — dry-run pricing for the checkout screen
router.post('/quote', authorize(ROLES.CUSTOMER, ROLES.VENDOR), validate({ body: QuoteOrderSchema }), OrdersController.quoteOrder);

// POST /api/v1/orders
router.post('/', authorize(ROLES.CUSTOMER, ROLES.VENDOR), validate({ body: PlaceOrderSchema }), idempotency, OrdersController.placeOrder);

// GET  /api/v1/orders
router.get('/', validate({ query: CustomerOrdersQuerySchema }), OrdersController.getMyOrders);

// GET  /api/v1/orders/:orderNumber
router.get('/:orderNumber', validate({ params: OrderNumberParamSchema }), OrdersController.getOrderByNumber);

// POST /api/v1/orders/:orderNumber/return  (customer requests return)
router.post(
  '/:orderNumber/return',
  validate({ params: OrderNumberParamSchema, body: ReturnRequestSchema }),
  OrdersController.requestReturn
);

// DELETE /api/v1/orders/:orderNumber  (cancel)
router.delete('/:orderNumber', validate({ params: OrderNumberParamSchema }), OrdersController.cancelOrder);

export default router;
