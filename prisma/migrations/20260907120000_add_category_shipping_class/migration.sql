-- Let a category (or sub-category) carry a default shipping class, so admins
-- don't have to set one on every product individually.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "shippingClassId" TEXT;

-- CreateIndex
CREATE INDEX "categories_shippingClassId_idx" ON "categories"("shippingClassId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shippingClassId_fkey" FOREIGN KEY ("shippingClassId") REFERENCES "shipping_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
