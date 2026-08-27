-- CreateEnum
CREATE TYPE "BannerButtonStyle" AS ENUM ('primary', 'outline');

-- CreateEnum
CREATE TYPE "BannerTextAlign" AS ENUM ('right', 'center', 'left');

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "buttonStyle" "BannerButtonStyle" NOT NULL DEFAULT 'primary',
ADD COLUMN     "buttonText" JSONB,
ADD COLUMN     "showButton" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "textAlign" "BannerTextAlign" NOT NULL DEFAULT 'right';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories" USING GIN ("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" USING GIN ("name");
