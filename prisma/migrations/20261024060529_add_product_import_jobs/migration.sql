-- CreateTable
CREATE TABLE "product_import_jobs" (
    "id" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "vendorId" VARCHAR(36) NOT NULL,
    "defaultCategoryId" VARCHAR(36),
    "createdById" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_import_jobs_createdAt_idx" ON "product_import_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "product_import_jobs_createdById_idx" ON "product_import_jobs"("createdById");
