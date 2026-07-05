import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { ROLES } from '@shared/constants/roles';
import {
  CreateZoneSchema,
  UpdateZoneSchema,
  CreateShippingClassSchema,
  UpdateShippingClassSchema,
  CreateMethodSchema,
  UpdateMethodSchema,
  CreateShipmentSchema,
  UpdateShipmentSchema,
  ListShipmentsQuerySchema,
  IdParamSchema,
  OrderNumberParamSchema,
  AvailableMethodsQuerySchema,
} from './shipping.validation';
import * as ShippingController from './shipping.controller';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/countries', ShippingController.getAvailableCountries);
router.get('/methods/available', validate({ query: AvailableMethodsQuerySchema }), ShippingController.getAvailableMethods);

// ─── Admin — Zone Management ──────────────────────────────────────────────────
router.get('/zones', authenticate, authorize(ROLES.ADMIN), ShippingController.listZones);
router.post('/zones', authenticate, authorize(ROLES.ADMIN), validate({ body: CreateZoneSchema }), ShippingController.createZone);
router.patch('/zones/:id', authenticate, authorize(ROLES.ADMIN), validate({ params: IdParamSchema, body: UpdateZoneSchema }), ShippingController.updateZone);
router.delete('/zones/:id', authenticate, authorize(ROLES.ADMIN), validate({ params: IdParamSchema }), ShippingController.deleteZone);

// ─── Shipping Classes — read for any authenticated user (product forms), manage admin-only ──
router.get('/classes', authenticate, ShippingController.listShippingClasses);
router.post('/classes', authenticate, authorize(ROLES.ADMIN), validate({ body: CreateShippingClassSchema }), ShippingController.createShippingClass);
router.patch('/classes/:id', authenticate, authorize(ROLES.ADMIN), validate({ params: IdParamSchema, body: UpdateShippingClassSchema }), ShippingController.updateShippingClass);
router.delete('/classes/:id', authenticate, authorize(ROLES.ADMIN), validate({ params: IdParamSchema }), ShippingController.deleteShippingClass);

// ─── Admin — Method Management ────────────────────────────────────────────────
router.get('/methods', authenticate, authorize(ROLES.ADMIN), ShippingController.listMethods);
router.post('/methods', authenticate, authorize(ROLES.ADMIN), validate({ body: CreateMethodSchema }), ShippingController.createMethod);
router.patch('/methods/:id', authenticate, authorize(ROLES.ADMIN), validate({ params: IdParamSchema, body: UpdateMethodSchema }), ShippingController.updateMethod);
router.delete('/methods/:id', authenticate, authorize(ROLES.ADMIN), validate({ params: IdParamSchema }), ShippingController.deleteMethod);

// ─── Admin — List All Shipments ───────────────────────────────────────────────
// GET /api/v1/shipping/shipments  (admin only)
router.get(
  '/shipments',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ query: ListShipmentsQuerySchema }),
  ShippingController.listShipments
);

// ─── Shipments (vendor creates, vendor/admin updates, all parties view) ───────
// IMPORTANT: static paths before :id
router.get('/shipments/order/:orderNumber', authenticate, validate({ params: OrderNumberParamSchema }), ShippingController.getShipmentsByOrder);
router.post('/shipments', authenticate, authorize(ROLES.VENDOR), validate({ body: CreateShipmentSchema }), ShippingController.createShipment);
router.patch('/shipments/:id', authenticate, authorize(ROLES.VENDOR, ROLES.ADMIN), validate({ params: IdParamSchema, body: UpdateShipmentSchema }), ShippingController.updateShipment);
router.get('/shipments/:id', authenticate, validate({ params: IdParamSchema }), ShippingController.getShipment);

export default router;
