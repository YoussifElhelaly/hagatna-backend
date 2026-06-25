import { prisma } from '@database/prisma/client';

const SINGLETON_ID = 'singleton';

// ─────────────────────────────────────────────────────────────────────────────
// getSettings  —  always returns a single row (creates it if missing)
// ─────────────────────────────────────────────────────────────────────────────
export const getSettings = async () => {
  const settings = await prisma.platformSettings.upsert({
    where:  { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });
  return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateSettings
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = async (data: {
  platformName?:    Record<string, string>;
  logo?:            string;
  favicon?:         string;
  currency?:        string;
  taxRate?:         number;
  maintenanceMode?: boolean;
  supportEmail?:    string;
  supportPhone?:    string;
  termsUrl?:        string;
  privacyUrl?:      string;
  maxCartItems?:    number;
}) => {
  return prisma.platformSettings.upsert({
    where:  { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
};
