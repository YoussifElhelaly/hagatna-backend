import { z } from 'zod';
import { HOME_SECTION_KEYS } from './home-sections.constants';

const LocalizedStringSchema = z.object({
  en: z.string().min(1, 'English title is required'),
  ar: z.string().min(1, 'Arabic title is required'),
});

const HomeSectionInputSchema = z.object({
  // Rejects any key outside the canonical list
  key: z.enum(HOME_SECTION_KEYS, {
    errorMap: () => ({ message: `Key must be one of: ${HOME_SECTION_KEYS.join(', ')}` }),
  }),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
  title: LocalizedStringSchema.optional(),
  itemLimit: z.number().int().min(1).max(100).optional(),
});

export const UpdateHomeSectionsSchema = z.object({
  sections: z
    .array(HomeSectionInputSchema)
    .min(1, 'At least one section is required')
    .refine(
      (arr) => new Set(arr.map((s) => s.key)).size === arr.length,
      { message: 'Duplicate section keys are not allowed' }
    ),
});
