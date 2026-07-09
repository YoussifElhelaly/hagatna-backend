import { prisma } from '@database/prisma/client';
import { redis, RedisKeys, TTL } from '@database/redis/client';
import type { HomeSectionKey } from './home-sections.constants';

export interface HomeSectionDTO {
  key: string;
  enabled: boolean;
  sortOrder: number;
  title: { en: string; ar: string } | null;
  itemLimit: number | null;
}

interface HomeSectionRow {
  key: string;
  enabled: boolean;
  sortOrder: number;
  titleEn: string | null;
  titleAr: string | null;
  itemLimit: number | null;
}

// Map a DB row to the public shape (title collapses to null when both langs unset)
const toDTO = (row: HomeSectionRow): HomeSectionDTO => ({
  key: row.key,
  enabled: row.enabled,
  sortOrder: row.sortOrder,
  title:
    row.titleEn === null && row.titleAr === null
      ? null
      : { en: row.titleEn ?? '', ar: row.titleAr ?? '' },
  itemLimit: row.itemLimit,
});

const listFromDb = async (): Promise<HomeSectionDTO[]> => {
  const rows = await prisma.homeSection.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      key: true,
      enabled: true,
      sortOrder: true,
      titleEn: true,
      titleAr: true,
      itemLimit: true,
    },
  });
  return rows.map(toDTO);
};

// ─────────────────────────────────────────────────────────────────────────────
// getHomeSections  —  public, ordered by sortOrder asc, cached ~2 min
// ─────────────────────────────────────────────────────────────────────────────
export const getHomeSections = async (): Promise<HomeSectionDTO[]> => {
  const cacheKey = RedisKeys.cache.homeSections();
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as HomeSectionDTO[];

  const sections = await listFromDb();
  await redis.setex(cacheKey, TTL.HOME_SECTIONS, JSON.stringify(sections));
  return sections;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateHomeSections  —  admin, upsert each section by key, returns updated list
// ─────────────────────────────────────────────────────────────────────────────
export interface HomeSectionInput {
  key: HomeSectionKey;
  enabled: boolean;
  sortOrder: number;
  title?: { en: string; ar: string };
  itemLimit?: number;
}

export const updateHomeSections = async (
  sections: HomeSectionInput[]
): Promise<HomeSectionDTO[]> => {
  await prisma.$transaction(
    sections.map((s) => {
      const data = {
        enabled: s.enabled,
        sortOrder: s.sortOrder,
        titleEn: s.title?.en ?? null,
        titleAr: s.title?.ar ?? null,
        itemLimit: s.itemLimit ?? null,
      };
      return prisma.homeSection.upsert({
        where:  { key: s.key },
        create: { key: s.key, ...data },
        update: data,
      });
    })
  );

  // Invalidate the public cache so the next GET reflects the change immediately
  await redis.del(RedisKeys.cache.homeSections());
  return listFromDb();
};
