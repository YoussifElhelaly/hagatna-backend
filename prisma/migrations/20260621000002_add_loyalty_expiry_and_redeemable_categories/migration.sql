-- Add pointsExpireAfterDays column to loyalty_settings
ALTER TABLE "loyalty_settings"
    ADD COLUMN IF NOT EXISTS "pointsExpireAfterDays" INTEGER NOT NULL DEFAULT 365;

-- Create loyalty_redeemable_categories table
CREATE TABLE IF NOT EXISTS "loyalty_redeemable_categories" (
    "id"         TEXT NOT NULL,
    "settingsId" TEXT NOT NULL DEFAULT 'singleton',
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "loyalty_redeemable_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_redeemable_categories_settingsId_categoryId_key" UNIQUE ("settingsId", "categoryId")
);

ALTER TABLE "loyalty_redeemable_categories"
    ADD CONSTRAINT "loyalty_redeemable_categories_settingsId_fkey"
    FOREIGN KEY ("settingsId") REFERENCES "loyalty_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_redeemable_categories"
    ADD CONSTRAINT "loyalty_redeemable_categories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
