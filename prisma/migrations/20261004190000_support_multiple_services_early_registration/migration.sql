-- DropIndex
DROP INDEX "EarlyRegistration_email_key";

-- AlterTable
ALTER TABLE "EarlyRegistration" ADD COLUMN     "service" TEXT NOT NULL DEFAULT 'kids-learning',
ALTER COLUMN "childAge" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EarlyRegistration_email_service_key" ON "EarlyRegistration"("email", "service");
