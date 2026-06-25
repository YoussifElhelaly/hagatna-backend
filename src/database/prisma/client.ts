import { PrismaClient } from '@prisma/client';
import { env } from '@config/env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Append pool settings to DATABASE_URL (Prisma reads them from the URL)
const databaseUrl = new URL(env.DATABASE_URL);
databaseUrl.searchParams.set('connection_limit', String(env.DB_POOL_SIZE));
databaseUrl.searchParams.set('pool_timeout', String(env.DB_POOL_TIMEOUT));
process.env.DATABASE_URL = databaseUrl.toString();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
