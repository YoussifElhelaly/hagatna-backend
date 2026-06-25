import { prisma } from '@database/prisma/client';

/**
 * Returns all descendant category IDs (children, grandchildren, …) for a given
 * category. Useful for "include subcategories" product queries and cache
 * invalidation.
 *
 * Example: Electronics → [Phones, Smartphones, Tablets, Laptops, …]
 */
export const getDescendantIds = async (categoryId: string): Promise<string[]> => {
  const children = await prisma.category.findMany({
    where:  { parentId: categoryId, deletedAt: null },
    select: { id: true },
  });
  const ids: string[] = children.map((c) => c.id);
  for (const child of children) {
    const grandchildren = await getDescendantIds(child.id);
    ids.push(...grandchildren);
  }
  return ids;
};

/**
 * Returns ancestor IDs ordered from root → direct parent.
 * e.g. Smartphones → ['electronics-id', 'phones-id']
 */
export const getAncestorIds = async (categoryId: string): Promise<string[]> => {
  const ids: string[] = [];
  let current = await prisma.category.findUnique({
    where:  { id: categoryId },
    select: { parentId: true },
  });
  while (current?.parentId) {
    ids.unshift(current.parentId);
    current = await prisma.category.findUnique({
      where:  { id: current.parentId },
      select: { parentId: true },
    });
  }
  return ids;
};
