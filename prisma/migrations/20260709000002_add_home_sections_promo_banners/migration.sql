-- Home page configuration: home_sections layout config + promo_banners content.

-- CreateTable: home_sections
CREATE TABLE "home_sections" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "titleEn" VARCHAR(255),
    "titleAr" VARCHAR(255),
    "itemLimit" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_sections_key_key" ON "home_sections"("key");
CREATE INDEX "home_sections_enabled_sortOrder_idx" ON "home_sections"("enabled", "sortOrder");

-- Seed the canonical home sections in a sensible default order (all enabled).
INSERT INTO "home_sections" ("id", "key", "enabled", "sortOrder", "itemLimit", "updatedAt") VALUES
    (gen_random_uuid(), 'bannerCarousel',  true, 1,  NULL, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'sectorCards',     true, 2,  NULL, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'flashDeals',      true, 3,  10,   CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'categories',      true, 4,  12,   CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'newArrivals',     true, 5,  10,   CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'promoBanners',    true, 6,  NULL, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'productColumns',  true, 7,  8,    CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'dealOfDay',       true, 8,  NULL, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'newsletter',      true, 9,  NULL, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'brands',          true, 10, 20,   CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'trustBar',        true, 11, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- CreateTable: promo_banners
CREATE TABLE "promo_banners" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "subtitle" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "ctaText" JSONB NOT NULL DEFAULT '{"en": "", "ar": ""}',
    "linkUrl" VARCHAR(500),
    "gradient" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_banners_isActive_order_idx" ON "promo_banners"("isActive", "order");
