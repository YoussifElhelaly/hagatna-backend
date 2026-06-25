import { z } from 'zod';
import { AttributeType } from '@prisma/client';

const localizedString = z.object({
  en: z.string().min(1),
  ar: z.string().min(1),
});

// ─── Admin: create a definition ──────────────────────────────────────────────
export const CreateAttributeDefinitionSchema = z.object({
  categoryId:  z.string().uuid(),
  key:         z.string().min(1).max(60).regex(/^[a-z0-9_]+$/, 'key must be lowercase letters, digits, or underscores'),
  label:       localizedString,
  type:        z.nativeEnum(AttributeType),
  unit:        z.string().max(20).optional(),
  options:     z.array(z.string().min(1).max(100)).min(1).optional(),
  isFilterable: z.boolean().optional().default(true),
  isRequired:   z.boolean().optional().default(false),
  sortOrder:    z.number().int().min(0).optional().default(0),
}).refine(
  (d) => {
    // select / multi_select must have options
    if (d.type === AttributeType.select || d.type === AttributeType.multi_select) {
      return Array.isArray(d.options) && d.options.length > 0;
    }
    return true;
  },
  { message: 'options are required for select and multi_select types', path: ['options'] }
);

// ─── Admin: update a definition ──────────────────────────────────────────────
export const UpdateAttributeDefinitionSchema = z.object({
  label:        localizedString.optional(),
  unit:         z.string().max(20).optional(),
  options:      z.array(z.string().min(1).max(100)).min(1).optional(),
  isFilterable: z.boolean().optional(),
  isRequired:   z.boolean().optional(),
  sortOrder:    z.number().int().min(0).optional(),
});

// ─── Vendor / Admin: set product attributes ───────────────────────────────────
export const SetProductAttributesSchema = z.object({
  // free-form key→value map; service validates against definitions
  attributes: z.record(z.string().min(1).max(60), z.string().max(255)),
});

// ─── Params ───────────────────────────────────────────────────────────────────
export const AttributeDefinitionIdParamSchema = z.object({
  id: z.string().uuid('Invalid definition ID'),
});

export const CategoryIdQuerySchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
});
