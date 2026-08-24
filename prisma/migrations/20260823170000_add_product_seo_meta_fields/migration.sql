-- Adds optional per-product SEO title/description override fields
-- (mirrors BlogPost.metaTitle / BlogPost.metaDescription, see
-- 20260712000003_add_blog_posts/migration.sql). Nullable — no backfill
-- needed, existing rows just have NULL and the storefront falls back to
-- the product's regular name/description.
ALTER TABLE "Product" ADD COLUMN "metaTitle" JSONB,
ADD COLUMN "metaDescription" JSONB;
