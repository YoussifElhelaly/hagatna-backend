-- Remove logo and banner columns from vendor_profiles
ALTER TABLE "vendor_profiles" DROP COLUMN IF EXISTS "logo";
ALTER TABLE "vendor_profiles" DROP COLUMN IF EXISTS "banner";
