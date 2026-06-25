-- AlterTable
ALTER TABLE "loyalty_transactions" ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_pages" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "audience" VARCHAR(20) NOT NULL,
    "title" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "content" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "slug" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "description" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "imageUrl" VARCHAR(500) NOT NULL,
    "imagePublicId" VARCHAR(200) NOT NULL,
    "linkUrl" VARCHAR(500),
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "legal_pages_slug_key" ON "legal_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "legal_pages_type_audience_key" ON "legal_pages"("type", "audience");

-- CreateIndex
CREATE INDEX "banners_isActive_order_idx" ON "banners"("isActive", "order");

-- CreateIndex
CREATE INDEX "loyalty_transactions_expiresAt_idx" ON "loyalty_transactions"("expiresAt");
