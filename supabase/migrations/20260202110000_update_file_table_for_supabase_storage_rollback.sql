-- Rollback: Revert File table changes

-- Add back the unique constraint on cloudinaryId
ALTER TABLE "public"."File" ADD CONSTRAINT "File_cloudinaryId_key" UNIQUE ("cloudinaryId");

-- Make cloudinaryId required again (only if all rows have cloudinaryId)
-- ALTER TABLE "public"."File" ALTER COLUMN "cloudinaryId" SET NOT NULL;

-- Optionally drop storage_path column
-- ALTER TABLE "public"."File" DROP COLUMN IF EXISTS "storage_path";
