-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "vendor_plans" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "defaultCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "maxProducts" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_plan_categories" (
    "planId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "vendor_plan_categories_pkey" PRIMARY KEY ("planId","categoryId")
);

-- CreateIndex
CREATE INDEX "vendor_plans_isActive_idx" ON "vendor_plans"("isActive");

-- CreateIndex
CREATE INDEX "vendor_profiles_planId_idx" ON "vendor_profiles"("planId");

-- AddForeignKey
ALTER TABLE "vendor_plan_categories" ADD CONSTRAINT "vendor_plan_categories_planId_fkey" FOREIGN KEY ("planId") REFERENCES "vendor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_plan_categories" ADD CONSTRAINT "vendor_plan_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_planId_fkey" FOREIGN KEY ("planId") REFERENCES "vendor_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
