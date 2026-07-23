import { AttributeType, ProductStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';
import { ApiError } from '@shared/utils/ApiError';
import type {
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
  AttributeFacet,
} from './attributes.types';
import type { LocalizedString } from '@shared/types';
import { getDescendantIds, getAncestorIds } from '@shared/utils/categoryTree';

// ─── Shared select ────────────────────────────────────────────────────────────
const definitionSelect = {
  id:           true,
  categoryId:   true,
  key:          true,
  label:        true,
  type:         true,
  unit:         true,
  options:      true,
  isFilterable: true,
  isRequired:   true,
  sortOrder:    true,
  createdAt:    true,
  updatedAt:    true,
};

/**
 * Invalidates the attribute-definition cache for a category AND all its
 * descendants (because they inherit from this category).
 */
const invalidateAttrCache = async (categoryId: string) => {
  const descendantIds = await getDescendantIds(categoryId);
  const keys = [categoryId, ...descendantIds].map(
    (id) => RedisKeys.cache.attributeDefinitions(id),
  );
  if (keys.length) await redis.del(...keys);
};

// ─────────────────────────────────────────────────────────────────────────────
// resolveDefinitions
// Core helper used by listDefinitions, getFacets, and setProductAttributes.
//
// Walks the ancestor chain and merges all definitions top-down so that:
//   • Parent definitions appear first
//   • If a child redefines the same key, the child's version wins
//   • Final list is sorted by sortOrder
// ─────────────────────────────────────────────────────────────────────────────
const resolveDefinitions = async (categoryId: string) => {
  const ancestorIds = await getAncestorIds(categoryId);
  const orderedIds  = [...ancestorIds, categoryId];   // root → leaf

  const allDefs = await prisma.attributeDefinition.findMany({
    where:   { categoryId: { in: orderedIds } },
    select:  definitionSelect,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  // Merge: later entries (closer to leaf) override earlier ones on the same key
  const defMap = new Map<string, typeof allDefs[0]>();
  for (const catId of orderedIds) {
    for (const def of allDefs.filter((d) => d.categoryId === catId)) {
      defMap.set(def.key, def);
    }
  }

  return Array.from(defMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime(),
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// listDefinitions  —  public + admin
// Returns OWN + INHERITED definitions, Redis-cached 1 hour per category.
// ─────────────────────────────────────────────────────────────────────────────
export const listDefinitions = async (categoryId: string) => {
  const cacheKey = RedisKeys.cache.attributeDefinitions(categoryId);
  const cached   = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const definitions = await resolveDefinitions(categoryId);
  await redis.setex(cacheKey, TTL.CATEGORIES, JSON.stringify(definitions));
  return definitions;
};

// ─────────────────────────────────────────────────────────────────────────────
// getDefinition  —  single by id (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getDefinition = async (id: string) => {
  const def = await prisma.attributeDefinition.findUnique({
    where:  { id },
    select: definitionSelect,
  });
  if (!def) throw ApiError.notFound('Attribute definition not found');
  return def;
};

// ─────────────────────────────────────────────────────────────────────────────
// createDefinition  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const createDefinition = async (input: CreateAttributeDefinitionInput) => {
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, deletedAt: null },
  });
  if (!category) throw ApiError.notFound('Category not found');

  // Key must be unique within the category itself
  // (inherited parent keys can be overridden intentionally)
  const existing = await prisma.attributeDefinition.findUnique({
    where: { categoryId_key: { categoryId: input.categoryId, key: input.key } },
  });
  if (existing) {
    throw ApiError.conflict(
      `Attribute key "${input.key}" already exists for this category. ` +
      `If you want to override an inherited key, edit it directly on the parent category.`,
    );
  }

  const def = await prisma.attributeDefinition.create({
    data: {
      categoryId:   input.categoryId,
      key:          input.key,
      label:        input.label as never,
      type:         input.type,
      unit:         input.unit,
      options:      input.options ? (input.options as never) : undefined,
      isFilterable: input.isFilterable ?? true,
      isRequired:   input.isRequired ?? false,
      sortOrder:    input.sortOrder ?? 0,
    },
    select: definitionSelect,
  });

  // Clear this category AND all descendants (they inherit from it)
  await invalidateAttrCache(input.categoryId);
  return def;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateDefinition  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const updateDefinition = async (id: string, input: UpdateAttributeDefinitionInput) => {
  const existing = await prisma.attributeDefinition.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Attribute definition not found');

  const def = await prisma.attributeDefinition.update({
    where: { id },
    data: {
      ...(input.label              && { label:        input.label as never }),
      ...(input.unit      !== undefined && { unit:   input.unit }),
      ...(input.options            && { options:      input.options as never }),
      ...(input.isFilterable !== undefined && { isFilterable: input.isFilterable }),
      ...(input.isRequired   !== undefined && { isRequired:   input.isRequired }),
      ...(input.sortOrder    !== undefined && { sortOrder:    input.sortOrder }),
    },
    select: definitionSelect,
  });

  // Changing a parent definition affects all children's resolved list
  await invalidateAttrCache(existing.categoryId);
  return def;
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteDefinition  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDefinition = async (id: string) => {
  const existing = await prisma.attributeDefinition.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Attribute definition not found');

  await prisma.attributeDefinition.delete({ where: { id } });
  await invalidateAttrCache(existing.categoryId);
};

// ─────────────────────────────────────────────────────────────────────────────
// setProductAttributes  (vendor / admin)
// Validates keys against INHERITED + OWN definitions so a vendor can set
// both parent-level (e.g. color, brand) and child-level (e.g. ram, storage).
// Vendors may only set attributes on their own products; admins may set on any.
// ─────────────────────────────────────────────────────────────────────────────
export const setProductAttributes = async (
  userId: string,
  isAdmin: boolean,
  productId: string,
  attributes: Record<string, string>,
) => {
  const product = await prisma.product.findFirst({
    where:  { id: productId, deletedAt: null },
    select: { id: true, categoryId: true, vendorId: true },
  });
  if (!product) throw ApiError.notFound('Product not found');

  if (!isAdmin) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) throw ApiError.forbidden('Vendor profile not found');
    if (product.vendorId !== vendor.id) throw ApiError.forbidden('You do not own this product');
  }

  // Resolve full definition set (own + inherited)
  const definitions = await resolveDefinitions(product.categoryId);
  const defByKey = Object.fromEntries(definitions.map((d) => [d.key, d]));

  // ── Validate supplied keys ──────────────────────────────────────────────────
  const unknownKeys = Object.keys(attributes).filter((k) => !defByKey[k]);
  if (unknownKeys.length) {
    throw ApiError.badRequest(
      `Unknown attribute keys for this category: ${unknownKeys.join(', ')}`,
    );
  }

  for (const [key, value] of Object.entries(attributes)) {
    const def = defByKey[key];

    if (
      (def.type === AttributeType.select || def.type === AttributeType.multi_select) &&
      def.options
    ) {
      const allowed  = def.options as string[];
      const supplied = def.type === AttributeType.multi_select
        ? value.split(',').map((v) => v.trim())
        : [value];
      const invalid  = supplied.filter((v) => !allowed.includes(v));
      if (invalid.length) {
        throw ApiError.badRequest(
          `Invalid value(s) "${invalid.join(', ')}" for "${key}". Allowed: ${allowed.join(', ')}`,
        );
      }
    }
    if (def.type === AttributeType.boolean && !['true', 'false'].includes(value)) {
      throw ApiError.badRequest(`Attribute "${key}" must be "true" or "false"`);
    }
    if (def.type === AttributeType.range && isNaN(Number(value))) {
      throw ApiError.badRequest(`Attribute "${key}" must be a number`);
    }
  }

  // ── Check required fields (inherited + own) ─────────────────────────────────
  const requiredMissing = definitions
    .filter((d) => d.isRequired && !(d.key in attributes))
    .map((d) => d.key);
  if (requiredMissing.length) {
    throw ApiError.badRequest(`Missing required attributes: ${requiredMissing.join(', ')}`);
  }

  // ── Upsert ──────────────────────────────────────────────────────────────────
  await prisma.$transaction(
    Object.entries(attributes).map(([key, value]) =>
      prisma.productAttribute.upsert({
        where:  { productId_definitionId: { productId, definitionId: defByKey[key].id } },
        create: { productId, definitionId: defByKey[key].id, value },
        update: { value },
      }),
    ),
  );

  return getProductAttributes(productId);
};

// ─────────────────────────────────────────────────────────────────────────────
// getProductAttributes  —  all attribute values for a product
// ─────────────────────────────────────────────────────────────────────────────
export const getProductAttributes = async (productId: string) => {
  const rows = await prisma.productAttribute.findMany({
    where:  { productId },
    select: {
      value: true,
      definition: {
        select: { key: true, label: true, type: true, unit: true },
      },
    },
    orderBy: { definition: { sortOrder: 'asc' as const } },
  });

  return rows.map((r) => ({
    key:   r.definition.key,
    label: r.definition.label as LocalizedString,
    type:  r.definition.type,
    unit:  r.definition.unit,
    value: r.value,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// getFacets  —  filterable attributes + per-value product counts.
// Includes INHERITED definitions so the filter panel shows parent-level
// attributes (e.g. brand, color) alongside child-level ones (e.g. ram).
// ─────────────────────────────────────────────────────────────────────────────
export const getFacets = async (categoryId: string, activeOnly = true): Promise<AttributeFacet[]> => {
  // Use full resolved set so inherited filterable attrs are included
  const allDefs = await resolveDefinitions(categoryId);
  const definitions = allDefs.filter((d) => d.isFilterable);

  if (!definitions.length) return [];

  const valueCounts = await prisma.productAttribute.groupBy({
    by:    ['definitionId', 'value'],
    where: {
      definitionId: { in: definitions.map((d) => d.id) },
      ...(activeOnly && {
        product: { status: ProductStatus.active, deletedAt: null },
      }),
    },
    _count: { value: true },
  });

  const countsByDef: Record<string, Record<string, number>> = {};
  for (const row of valueCounts) {
    if (!countsByDef[row.definitionId]) countsByDef[row.definitionId] = {};
    countsByDef[row.definitionId][row.value] = row._count.value;
  }

  return definitions.map((def) => ({
    key:     def.key,
    label:   def.label as LocalizedString,
    type:    def.type,
    unit:    def.unit,
    options: (def.options as string[] | null) ?? Object.keys(countsByDef[def.id] ?? {}),
    counts:  countsByDef[def.id] ?? {},
  }));
};
