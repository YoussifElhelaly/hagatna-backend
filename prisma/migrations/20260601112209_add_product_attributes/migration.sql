-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('select', 'multi_select', 'range', 'boolean');

-- CreateTable
CREATE TABLE "attribute_definitions" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "label" JSONB NOT NULL,
    "type" "AttributeType" NOT NULL,
    "unit" VARCHAR(20),
    "options" JSONB,
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attribute_definitions_categoryId_isFilterable_idx" ON "attribute_definitions"("categoryId", "isFilterable");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_definitions_categoryId_key_key" ON "attribute_definitions"("categoryId", "key");

-- CreateIndex
CREATE INDEX "product_attributes_productId_idx" ON "product_attributes"("productId");

-- CreateIndex
CREATE INDEX "product_attributes_definitionId_value_idx" ON "product_attributes"("definitionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "product_attributes_productId_definitionId_key" ON "product_attributes"("productId", "definitionId");

-- AddForeignKey
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
