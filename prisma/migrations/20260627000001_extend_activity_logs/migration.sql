-- CreateEnum
CREATE TYPE "ActivityRole" AS ENUM ('admin', 'vendor', 'customer', 'system');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('auth', 'order', 'product', 'cart', 'review', 'vendor', 'wishlist', 'settings', 'loyalty', 'system');

-- RenameTable
ALTER TABLE "admin_activity_logs" RENAME TO "activity_logs";

-- RenameColumn
ALTER TABLE "activity_logs" RENAME COLUMN "adminId" TO "userId";

-- AlterTable: Add new columns with defaults
ALTER TABLE "activity_logs" ADD COLUMN "role" "ActivityRole" NOT NULL DEFAULT 'admin';
ALTER TABLE "activity_logs" ADD COLUMN "category" "ActivityCategory" NOT NULL DEFAULT 'system';
ALTER TABLE "activity_logs" ADD COLUMN "userAgent" VARCHAR(500);

-- AlterTable: Make userId nullable (for system events)
ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- Drop old index
DROP INDEX IF EXISTS "activity_logs_adminId_idx";

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");
CREATE INDEX "activity_logs_role_idx" ON "activity_logs"("role");
CREATE INDEX "activity_logs_category_idx" ON "activity_logs"("category");
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");
