import { prisma } from '@database/prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Public storefront settings — admin-controlled feature toggles.
// Backed by the key/value `settings` table so new flags can be added without
// a schema migration. Each flag has a safe default when the row is unset.
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  sellWithUsEnabled: 'sellWithUsEnabled',
} as const;

const DEFAULTS = {
  sellWithUsEnabled: true,
};

export interface PublicSettings {
  sellWithUsEnabled: boolean;
}

/** Read a boolean flag, falling back to its default when unset. */
const readBool = async (key: string, fallback: boolean): Promise<boolean> => {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? Boolean(row.value) : fallback;
};

// ─── GET public settings ──────────────────────────────────────────────────────
export const getPublicSettings = async (): Promise<PublicSettings> => {
  return {
    sellWithUsEnabled: await readBool(KEYS.sellWithUsEnabled, DEFAULTS.sellWithUsEnabled),
  };
};

// ─── PUT settings (admin) — upsert then return the full public shape ──────────
export const updateSettings = async (input: {
  sellWithUsEnabled: boolean;
}): Promise<PublicSettings> => {
  await prisma.setting.upsert({
    where:  { key: KEYS.sellWithUsEnabled },
    create: { key: KEYS.sellWithUsEnabled, value: input.sellWithUsEnabled },
    update: { value: input.sellWithUsEnabled },
  });

  return getPublicSettings();
};
