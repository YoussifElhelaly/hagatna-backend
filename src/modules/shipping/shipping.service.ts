import { ShipmentStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';
import type {
  CreateZoneInput,
  UpdateZoneInput,
  CreateShippingClassInput,
  UpdateShippingClassInput,
  CreateMethodInput,
  UpdateMethodInput,
  CreateShipmentInput,
  UpdateShipmentInput,
  AvailableMethodsQuery,
} from './shipping.types';

// ─── Shipment status flow ─────────────────────────────────────────────────────
const SHIPMENT_FLOW: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.preparing]:        [ShipmentStatus.shipped, ShipmentStatus.failed],
  [ShipmentStatus.shipped]:          [ShipmentStatus.in_transit, ShipmentStatus.failed],
  [ShipmentStatus.in_transit]:       [ShipmentStatus.out_for_delivery, ShipmentStatus.failed],
  [ShipmentStatus.out_for_delivery]: [ShipmentStatus.delivered, ShipmentStatus.failed],
  [ShipmentStatus.delivered]:        [],
  [ShipmentStatus.failed]:           [ShipmentStatus.preparing],
};

const isValidShipmentTransition = (from: ShipmentStatus, to: ShipmentStatus): boolean =>
  SHIPMENT_FLOW[from]?.includes(to) ?? false;

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING ZONES  (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const listZones = async () => {
  return prisma.shippingZone.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { methods: { where: { deletedAt: null } } } },
    },
  });
};

export const createZone = async (input: CreateZoneInput) => {
  return prisma.shippingZone.create({
    data: input,
    include: { _count: { select: { methods: true } } },
  });
};

export const updateZone = async (zoneId: string, input: UpdateZoneInput) => {
  const zone = await prisma.shippingZone.findFirst({ where: { id: zoneId, deletedAt: null } });
  if (!zone) throw ApiError.notFound('Shipping zone not found');
  return prisma.shippingZone.update({
    where: { id: zoneId },
    data: input,
    include: { _count: { select: { methods: true } } },
  });
};

export const deleteZone = async (zoneId: string) => {
  const zone = await prisma.shippingZone.findFirst({
    where: { id: zoneId, deletedAt: null },
    include: { _count: { select: { methods: { where: { deletedAt: null } } } } },
  });
  if (!zone) throw ApiError.notFound('Shipping zone not found');
  if (zone._count.methods > 0) {
    throw ApiError.conflict(`Cannot delete: zone has ${zone._count.methods} method(s). Remove them first.`);
  }
  await prisma.shippingZone.update({ where: { id: zoneId }, data: { deletedAt: new Date() } });
};

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING CLASSES  (admin manages; vendors/admin read for product forms)
// ─────────────────────────────────────────────────────────────────────────────

export const listShippingClasses = async (includeInactive = false) => {
  return prisma.shippingClass.findMany({
    where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });
};

export const createShippingClass = async (input: CreateShippingClassInput) => {
  return prisma.shippingClass.create({
    data: input as never,
    include: { _count: { select: { products: true } } },
  });
};

export const updateShippingClass = async (classId: string, input: UpdateShippingClassInput) => {
  const cls = await prisma.shippingClass.findFirst({ where: { id: classId, deletedAt: null } });
  if (!cls) throw ApiError.notFound('Shipping class not found');
  return prisma.shippingClass.update({
    where: { id: classId },
    data: input as never,
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });
};

export const deleteShippingClass = async (classId: string) => {
  const cls = await prisma.shippingClass.findFirst({
    where: { id: classId, deletedAt: null },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });
  if (!cls) throw ApiError.notFound('Shipping class not found');
  if (cls._count.products > 0) {
    throw ApiError.conflict(
      `Cannot delete: ${cls._count.products} product(s) use this shipping class. Reassign them first.`
    );
  }
  await prisma.shippingClass.update({
    where: { id: classId },
    data: { deletedAt: new Date(), isActive: false },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING METHODS  (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const listMethods = async (zoneId?: string) => {
  return prisma.shippingMethod.findMany({
    where: { deletedAt: null, isActive: true, ...(zoneId && { zoneId }) },
    orderBy: { price: 'asc' },
    include: { zone: { select: { id: true, name: true, countries: true } } },
  });
};

export const createMethod = async (input: CreateMethodInput) => {
  const zone = await prisma.shippingZone.findFirst({ where: { id: input.zoneId, deletedAt: null } });
  if (!zone) throw ApiError.notFound('Shipping zone not found');
  return prisma.shippingMethod.create({
    data: input,
    include: { zone: { select: { id: true, name: true } } },
  });
};

export const updateMethod = async (methodId: string, input: UpdateMethodInput) => {
  const method = await prisma.shippingMethod.findFirst({ where: { id: methodId, deletedAt: null } });
  if (!method) throw ApiError.notFound('Shipping method not found');
  return prisma.shippingMethod.update({
    where: { id: methodId },
    data: input,
    include: { zone: { select: { id: true, name: true } } },
  });
};

export const deleteMethod = async (methodId: string) => {
  const method = await prisma.shippingMethod.findFirst({ where: { id: methodId, deletedAt: null } });
  if (!method) throw ApiError.notFound('Shipping method not found');
  await prisma.shippingMethod.update({ where: { id: methodId }, data: { deletedAt: new Date(), isActive: false } });
};

// ─────────────────────────────────────────────────────────────────────────────
// getAvailableCountries  —  public: all countries across active zones
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableCountries = async () => {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true, deletedAt: null },
    select: { countries: true },
  });
  const countrySet = new Set<string>();
  for (const zone of zones) {
    for (const c of zone.countries as string[]) {
      countrySet.add(c.toUpperCase());
    }
  }
  return Array.from(countrySet).sort();
};

// ─────────────────────────────────────────────────────────────────────────────
// getAvailableMethods  —  public
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableMethods = async (query: AvailableMethodsQuery) => {
  const { country, orderSubtotal = 0 } = query;
  const methods = await prisma.shippingMethod.findMany({
    where: { isActive: true, deletedAt: null, zone: { isActive: true, deletedAt: null } },
    include: { zone: { select: { id: true, name: true, countries: true } } },
    orderBy: { price: 'asc' },
  });
  const applicable = methods.filter((m) => {
    const zoneCountries = m.zone.countries as string[];
    return zoneCountries.includes(country.toUpperCase());
  });
  return applicable.map((m) => {
    let effectivePrice = Number(m.price);
    if (m.isFree) effectivePrice = 0;
    else if (m.minOrderForFree && orderSubtotal >= Number(m.minOrderForFree)) effectivePrice = 0;
    return {
      id: m.id, name: m.name, minDays: m.minDays, maxDays: m.maxDays,
      originalPrice: Number(m.price), effectivePrice,
      isFreeForThisOrder: effectivePrice === 0,
      minOrderForFree: m.minOrderForFree ? Number(m.minOrderForFree) : null,
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// listShipments  —  admin: all shipments with filters
// ─────────────────────────────────────────────────────────────────────────────
export const listShipments = async (query: {
  page?: number; limit?: number; status?: ShipmentStatus; vendorId?: string; orderId?: string;
}) => {
  const { page = 1, limit = 20, status, vendorId, orderId } = query;
  const skip = (page - 1) * limit;
  const where = {
    ...(status && { status }),
    ...(vendorId && { vendorId }),
    ...(orderId && { orderId }),
  };
  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { orderNumber: true, userId: true } },
        vendor: { select: { id: true, storeName: true, storeSlug: true } },
        shippingMethod: { select: { id: true, name: true } },
      },
    }),
    prisma.shipment.count({ where }),
  ]);
  return { shipments, meta: buildPaginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// SHIPMENTS  (vendor creates, vendor/admin updates, all parties can view)
// ─────────────────────────────────────────────────────────────────────────────

export const createShipment = async (userId: string, input: CreateShipmentInput) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) throw ApiError.forbidden('Vendor profile not found');
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: { where: { vendorId: vendor.id } } },
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.items.length === 0) throw ApiError.forbidden('This order has no items from your store');
  const existing = await prisma.shipment.findFirst({ where: { orderId: input.orderId, vendorId: vendor.id } });
  if (existing) throw ApiError.conflict('A shipment already exists for this vendor and order');
  if (input.shippingMethodId) {
    const method = await prisma.shippingMethod.findFirst({ where: { id: input.shippingMethodId, deletedAt: null } });
    if (!method || !method.isActive) throw ApiError.notFound('Shipping method not found');
  }
  return prisma.shipment.create({
    data: {
      orderId: input.orderId, vendorId: vendor.id,
      shippingMethodId: input.shippingMethodId, carrier: input.carrier,
      trackingNumber: input.trackingNumber, trackingUrl: input.trackingUrl,
      estimatedDelivery: input.estimatedDelivery ? new Date(input.estimatedDelivery) : undefined,
    },
    include: {
      shippingMethod: { select: { id: true, name: true, minDays: true, maxDays: true } },
      vendor: { select: { id: true, storeName: true } },
    },
  });
};

export const updateShipment = async (
  userId: string, shipmentId: string, input: UpdateShipmentInput, isAdmin: boolean
) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw ApiError.notFound('Shipment not found');
  if (!isAdmin) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || shipment.vendorId !== vendor.id) throw ApiError.forbidden('Access denied');
  }
  if (input.status) {
    const newStatus = input.status as ShipmentStatus;
    if (!isValidShipmentTransition(shipment.status, newStatus)) {
      throw ApiError.conflict(`Cannot transition shipment from "${shipment.status}" to "${newStatus}"`);
    }
  }
  const data: Record<string, unknown> = { ...input };
  if (input.estimatedDelivery !== undefined) {
    data.estimatedDelivery = input.estimatedDelivery ? new Date(input.estimatedDelivery) : null;
  }
  if (input.status === ShipmentStatus.shipped) data.shippedAt = new Date();
  if (input.status === ShipmentStatus.delivered) data.deliveredAt = new Date();
  return prisma.shipment.update({
    where: { id: shipmentId }, data,
    include: {
      shippingMethod: { select: { id: true, name: true } },
      vendor: { select: { id: true, storeName: true } },
    },
  });
};

export const getShipment = async (userId: string, shipmentId: string, isAdmin: boolean) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      order: { select: { orderNumber: true, userId: true } },
      shippingMethod: { select: { id: true, name: true, minDays: true, maxDays: true } },
      vendor: { select: { id: true, storeName: true } },
    },
  });
  if (!shipment) throw ApiError.notFound('Shipment not found');
  if (!isAdmin) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    const isOrderOwner = shipment.order.userId === userId;
    const isShipmentVendor = vendor?.id === shipment.vendorId;
    if (!isOrderOwner && !isShipmentVendor) throw ApiError.forbidden('Access denied');
  }
  return shipment;
};

export const getShipmentsByOrder = async (userId: string, orderNumber: string, isAdmin: boolean) => {
  const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, userId: true } });
  if (!order) throw ApiError.notFound('Order not found');
  if (!isAdmin && order.userId !== userId) throw ApiError.forbidden('Access denied');
  return prisma.shipment.findMany({
    where: { orderId: order.id },
    include: {
      shippingMethod: { select: { id: true, name: true } },
      vendor: { select: { id: true, storeName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
};
