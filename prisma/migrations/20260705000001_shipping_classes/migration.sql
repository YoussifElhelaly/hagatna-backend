-- Replace per-unit product shipping cost with shipping classes

-- DropColumn
ALTER TABLE "products" DROP COLUMN IF EXISTS "shippingCost";

-- CreateTable
CREATE TABLE "shipping_classes" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "baseCost" DECIMAL(12,2) NOT NULL,
    "extraUnitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxCost" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_classes_isActive_idx" ON "shipping_classes"("isActive");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "shippingClassId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shippingClassId_fkey" FOREIGN KEY ("shippingClassId") REFERENCES "shipping_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
