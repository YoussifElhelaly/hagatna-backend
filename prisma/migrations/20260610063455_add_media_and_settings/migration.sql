-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255),
    "folder" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(20) NOT NULL DEFAULT 'image',
    "uploadedById" TEXT NOT NULL,
    "vendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformName" JSONB NOT NULL DEFAULT '{"en": "Hagatna", "ar": "هاجتنا"}',
    "logo" TEXT,
    "favicon" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'EGP',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "supportEmail" VARCHAR(255),
    "supportPhone" VARCHAR(50),
    "termsUrl" TEXT,
    "privacyUrl" TEXT,
    "maxCartItems" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_uploadedById_idx" ON "media_assets"("uploadedById");

-- CreateIndex
CREATE INDEX "media_assets_vendorId_idx" ON "media_assets"("vendorId");

-- CreateIndex
CREATE INDEX "media_assets_folder_idx" ON "media_assets"("folder");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
