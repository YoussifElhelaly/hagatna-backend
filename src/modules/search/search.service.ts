import { ProductStatus } from '@prisma/client';
import { prisma } from '@database/prisma/client';

/** lowercase, trim, and collapse internal whitespace — the grouping key. */
export const normalizeTerm = (term: string): string =>
  term.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Record a committed storefront search. Terms shorter than 2 chars are ignored
 * as autocomplete noise. We also snapshot how many active products matched, so
 * high-demand terms that return nothing can be surfaced later.
 */
export const logSearch = async (rawTerm: string): Promise<void> => {
  const term = rawTerm.trim().slice(0, 100);
  const normalized = normalizeTerm(term);
  if (normalized.length < 2) return;

  // Mirror the storefront product search (products.service listProducts) so the
  // snapshot reflects what the user actually saw — it uses the original-case
  // term with case-sensitive JSON string_contains on the name paths.
  const resultsCount = await prisma.product.count({
    where: {
      status: ProductStatus.active,
      deletedAt: null,
      OR: [
        { name: { path: ['en'], string_contains: term } },
        { name: { path: ['ar'], string_contains: term } },
        { slug: { contains: term, mode: 'insensitive' } },
      ],
    },
  });

  await prisma.searchQuery.create({
    data: { term, normalized, resultsCount },
  });
};

export interface TopSearch {
  term: string;
  count: number;
  avgResults: number;
  lastSearchedAt: Date;
}

/** Most-searched terms (grouped by normalized form) within an optional range. */
export const getTopSearches = async (
  limit = 20,
  from?: string,
  to?: string,
): Promise<TopSearch[]> => {
  const createdAt =
    from || to
      ? {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        }
      : undefined;

  const rows = await prisma.searchQuery.groupBy({
    by: ['normalized'],
    ...(createdAt && { where: { createdAt } }),
    _count: { _all: true },
    _avg: { resultsCount: true },
    _max: { term: true, createdAt: true },
    orderBy: { _count: { normalized: 'desc' } },
    take: limit,
  });

  return rows.map((r) => ({
    term: r._max.term ?? r.normalized,
    count: r._count._all,
    avgResults: Math.round(r._avg.resultsCount ?? 0),
    lastSearchedAt: r._max.createdAt ?? new Date(0),
  }));
};
