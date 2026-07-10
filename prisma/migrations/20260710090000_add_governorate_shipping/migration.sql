-- Shipping zones now match on Egyptian governorate rather than country.
-- The governorate list lives in the existing "regions" column (mapped in the
-- Prisma schema), so zones need no data migration.

-- Addresses gain a governorate, nullable because existing rows predate it.
ALTER TABLE "addresses" ADD COLUMN "governorate" VARCHAR(100);

-- Zones are Egypt-only; countries is retained for compatibility but defaulted.
ALTER TABLE "shipping_zones" ALTER COLUMN "countries" SET DEFAULT '["EG"]';

-- Reconcile pre-existing drift on activity_logs. Postgres does not allow
-- RENAME CONSTRAINT to be combined with other actions in one ALTER TABLE.
ALTER TABLE "activity_logs" RENAME CONSTRAINT "admin_activity_logs_pkey" TO "activity_logs_pkey";
ALTER TABLE "activity_logs" ALTER COLUMN "userId" SET DATA TYPE VARCHAR(100);
ALTER TABLE "activity_logs" ALTER COLUMN "role" SET DEFAULT 'system';

ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER INDEX "admin_activity_logs_createdAt_idx" RENAME TO "activity_logs_createdAt_idx";
ALTER INDEX "admin_activity_logs_entityType_entityId_idx" RENAME TO "activity_logs_entityType_entityId_idx";
