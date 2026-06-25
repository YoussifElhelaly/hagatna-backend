import slugify from 'slugify';
import { prisma } from '@database/prisma/client';

const slugifyOptions = {
  lower: true,
  strict: true,
  trim: true,
  locale: 'en',
};

/**
 * Generates a base slug from a string.
 * Always uses the English version to keep URLs clean and consistent.
 */
export const generateSlug = (text: string): string => {
  return slugify(text, slugifyOptions);
};

/**
 * Generates a unique slug for a given model by appending a suffix if needed.
 * e.g. "iphone-case" → "iphone-case-2" → "iphone-case-3"
 */
export const generateUniqueSlug = async (
  text: string,
  model: 'product' | 'category' | 'vendorProfile',
  excludeId?: string
): Promise<string> => {
  const base = generateSlug(text);
  let slug = base;
  let counter = 1;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma[model] as any).findFirst({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (!existing) break;
    counter++;
    slug = `${base}-${counter}`;
  }

  return slug;
};
