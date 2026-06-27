import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as OrdersService from './orders.service';
import { logActivity } from '@modules/activity-logs/activity-logs.service';

// ─── POST /orders  (customer) ─────────────────────────────────────────────────
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const orders = await OrdersService.placeOrder(req.user!.id, req.body);
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'create_order',
    category: 'order',
    entityType: 'order',
    entityId: orders[0]?.id,
    entityLabel: orders.map((o: any) => o.orderNumber).join(', '),
    metadata: { itemCount: orders.length, total: orders.reduce((s: number, o: any) => s + Number(o.total), 0) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  const message =
    orders.length === 1 ? 'Order placed successfully' : `${orders.length} orders placed successfully`;
  sendCreated(res, message, orders);
});

// ─── GET /orders  (customer) ──────────────────────────────────────────────────
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { orders, meta } = await OrdersService.getMyOrders(
    req.user!.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Orders retrieved', data: orders, meta });
});

// ─── GET /orders/:orderNumber  (customer or admin) ────────────────────────────
export const getOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const order = await OrdersService.getOrderByNumber(
    req.user!.id,
    req.params.orderNumber,
    isAdmin
  );
  sendSuccess({ res, message: 'Order retrieved', data: order });
});

// ─── DELETE /orders/:orderNumber  (customer cancel) ───────────────────────────
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrdersService.cancelOrder(req.user!.id, req.params.orderNumber);
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'cancel_order',
    category: 'order',
    entityType: 'order',
    entityId: (order as any).id,
    entityLabel: req.params.orderNumber,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Order cancelled successfully', data: order });
});

// ─── GET /orders/vendor/:orderNumber  (vendor) ───────────────────────────────
export const getVendorOrderDetail = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrdersService.getVendorOrderDetail(
    req.user!.id,
    req.params.orderNumber
  );
  sendSuccess({ res, message: 'Order details retrieved', data: order });
});

// ─── GET /orders/vendor/items  (vendor) ───────────────────────────────────────
export const getVendorItems = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await OrdersService.getVendorItems(
    req.user!.id,
    req.query as never
  );
  sendSuccess({ res, message: 'Order items retrieved', data: items, meta });
});

// ─── PATCH /orders/vendor/items/:itemId/status  (vendor) ─────────────────────
export const updateItemStatus = asyncHandler(async (req: Request, res: Response) => {
  const item = await OrdersService.updateItemStatus(
    req.user!.id,
    req.params.itemId,
    req.body
  );
  logActivity({
    userId: req.user!.id,
    role: 'vendor',
    action: 'update_order_item_status',
    category: 'order',
    entityType: 'order_item',
    entityId: req.params.itemId,
    metadata: { status: req.body.status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Item status updated', data: item });
});

// ─── GET /orders/admin  (admin) ───────────────────────────────────────────────
export const listAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { orders, meta } = await OrdersService.listAllOrders(req.query as never);
  sendSuccess({ res, message: 'All orders retrieved', data: orders, meta });
});

// ─── PATCH /orders/admin/:orderNumber/status  (admin) ────────────────────────
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrdersService.updateOrderStatus(
    req.user!.id,
    req.params.orderNumber,
    req.body
  );
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    action: 'update_order_status',
    category: 'order',
    entityType: 'order',
    entityLabel: req.params.orderNumber,
    metadata: { status: req.body.status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Order status updated', data: order });
});

// ─── GET /orders/admin/:orderNumber  (admin) ──────────────────────────────────
export const getAdminOrderDetail = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrdersService.getAdminOrderDetail(req.params.orderNumber);
  sendSuccess({ res, message: 'Order retrieved', data: order });
});

// ─── POST /orders/:orderNumber/return  (customer) ────────────────────────────
export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
  const refund = await OrdersService.requestReturn(req.user!.id, req.params.orderNumber, req.body);
  logActivity({
    userId: req.user!.id,
    role: req.user!.role.toLowerCase() as 'admin' | 'vendor' | 'customer',
    action: 'request_return',
    category: 'order',
    entityType: 'order',
    entityLabel: req.params.orderNumber,
    metadata: { reason: req.body.reason },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendCreated(res, 'Return request submitted successfully', refund);
});

// ─── GET /orders/admin/returns  (admin) ──────────────────────────────────────
export const listReturns = asyncHandler(async (req: Request, res: Response) => {
  const { refunds, meta } = await OrdersService.listReturns(req.query as never);
  sendSuccess({ res, message: 'Return requests retrieved', data: refunds, meta });
});

// ─── PATCH /orders/admin/returns/:returnId/approve  (admin) ──────────────────
export const approveReturn = asyncHandler(async (req: Request, res: Response) => {
  const refund = await OrdersService.approveReturn(req.params.returnId, req.user!.id);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    action: 'approve_return',
    category: 'order',
    entityType: 'refund',
    entityId: req.params.returnId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Return approved — order marked as refunded', data: refund });
});

// ─── PATCH /orders/admin/returns/:returnId/refund  (admin) ───────────────────
export const processRefund = asyncHandler(async (req: Request, res: Response) => {
  const refund = await OrdersService.processRefund(req.params.returnId);
  logActivity({
    userId: req.user!.id,
    role: 'admin',
    action: 'process_refund',
    category: 'order',
    entityType: 'refund',
    entityId: req.params.returnId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess({ res, message: 'Refund processed successfully', data: refund });
});
