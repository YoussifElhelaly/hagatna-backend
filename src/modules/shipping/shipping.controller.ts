import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '@shared/utils/ApiResponse';
import { ROLES } from '@shared/constants/roles';
import * as ShippingService from './shipping.service';

// ─── Zones ────────────────────────────────────────────────────────────────────

export const listZones = asyncHandler(async (_req: Request, res: Response) => {
  const zones = await ShippingService.listZones();
  sendSuccess({ res, message: 'Shipping zones retrieved', data: zones });
});

export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await ShippingService.createZone(req.body);
  sendCreated(res, 'Shipping zone created', zone);
});

export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await ShippingService.updateZone(req.params.id, req.body);
  sendSuccess({ res, message: 'Shipping zone updated', data: zone });
});

export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  await ShippingService.deleteZone(req.params.id);
  sendSuccess({ res, message: 'Shipping zone deleted', data: null });
});

// ─── Shipping Classes ─────────────────────────────────────────────────────────

export const listShippingClasses = asyncHandler(async (req: Request, res: Response) => {
  // Admin sees inactive classes too (for management); others only active
  const isAdmin = (req.user as { role?: string } | undefined)?.role === ROLES.ADMIN;
  const classes = await ShippingService.listShippingClasses(isAdmin);
  sendSuccess({ res, message: 'Shipping classes retrieved', data: classes });
});

export const createShippingClass = asyncHandler(async (req: Request, res: Response) => {
  const cls = await ShippingService.createShippingClass(req.body);
  sendCreated(res, 'Shipping class created', cls);
});

export const updateShippingClass = asyncHandler(async (req: Request, res: Response) => {
  const cls = await ShippingService.updateShippingClass(req.params.id, req.body);
  sendSuccess({ res, message: 'Shipping class updated', data: cls });
});

export const deleteShippingClass = asyncHandler(async (req: Request, res: Response) => {
  await ShippingService.deleteShippingClass(req.params.id);
  sendSuccess({ res, message: 'Shipping class deleted', data: null });
});

// ─── Methods ──────────────────────────────────────────────────────────────────

export const listMethods = asyncHandler(async (req: Request, res: Response) => {
  const methods = await ShippingService.listMethods(req.query.zoneId as string | undefined);
  sendSuccess({ res, message: 'Shipping methods retrieved', data: methods });
});

export const createMethod = asyncHandler(async (req: Request, res: Response) => {
  const method = await ShippingService.createMethod(req.body);
  sendCreated(res, 'Shipping method created', method);
});

export const updateMethod = asyncHandler(async (req: Request, res: Response) => {
  const method = await ShippingService.updateMethod(req.params.id, req.body);
  sendSuccess({ res, message: 'Shipping method updated', data: method });
});

export const deleteMethod = asyncHandler(async (req: Request, res: Response) => {
  await ShippingService.deleteMethod(req.params.id);
  sendSuccess({ res, message: 'Shipping method removed', data: null });
});

// ─── Available countries (public) ────────────────────────────────────────────

export const getAvailableCountries = asyncHandler(async (_req: Request, res: Response) => {
  const countries = await ShippingService.getAvailableCountries();
  sendSuccess({ res, message: 'Available countries retrieved', data: countries });
});

// ─── Available methods (public) ───────────────────────────────────────────────

export const getAvailableMethods = asyncHandler(async (req: Request, res: Response) => {
  const methods = await ShippingService.getAvailableMethods(req.query as never);
  sendSuccess({ res, message: 'Available shipping methods retrieved', data: methods });
});

// ─── Shipments ────────────────────────────────────────────────────────────────

export const createShipment = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await ShippingService.createShipment(req.user!.id, req.body);
  sendCreated(res, 'Shipment created', shipment);
});

export const updateShipment = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const shipment = await ShippingService.updateShipment(
    req.user!.id,
    req.params.id,
    req.body,
    isAdmin
  );
  sendSuccess({ res, message: 'Shipment updated', data: shipment });
});

export const getShipment = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const shipment = await ShippingService.getShipment(req.user!.id, req.params.id, isAdmin);
  sendSuccess({ res, message: 'Shipment retrieved', data: shipment });
});

export const getShipmentsByOrder = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === ROLES.ADMIN;
  const shipments = await ShippingService.getShipmentsByOrder(
    req.user!.id,
    req.params.orderNumber,
    isAdmin
  );
  sendSuccess({ res, message: 'Shipments retrieved', data: shipments });
});

// ─── Admin: GET /shipping/shipments  (admin) ──────────────────────────────────
export const listShipments = asyncHandler(async (req: Request, res: Response) => {
  const { shipments, meta } = await ShippingService.listShipments(req.query as never);
  sendSuccess({ res, message: 'Shipments retrieved', data: shipments, meta });
});
