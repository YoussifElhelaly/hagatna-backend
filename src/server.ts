import './instrument'; // ⚠️ Must be first — instruments Express, Prisma, HTTP before any other import
import { createServer } from 'http';
import app from './app';
import { env } from '@config/env';
import { prisma } from '@database/prisma/client';
import { redis } from '@database/redis/client';
import { initSocket } from '@socket/index';
import { logger } from '@shared/utils/logger';
import { isPaymobEnabled } from '@modules/payments/payments.routes';

const httpServer = createServer(app);

// ─── Initialize Socket.io ─────────────────────────────────────────────────────
initSocket(httpServer);

// ─── Start Server ─────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected via Prisma');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📡 API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(
        isPaymobEnabled
          ? '💳 Paymob payment gateway: ENABLED'
          : '⚠️  Paymob payment gateway: DISABLED (set PAYMOB_* env vars to enable)',
      );
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    logger.info('🛑 Server shut down cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

start();
