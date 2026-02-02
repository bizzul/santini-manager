-- Migration: Update File table from Cloudinary to Supabase Storage

-- Add storage_path column if it doesn't exist
ALTER TABLE "public"."File" ADD COLUMN IF NOT EXISTS "storage_path" text;

-- Make cloudinaryId nullable (it was required for Cloudinary but now we use storage_path)
ALTER TABLE "public"."File" ALTER COLUMN "cloudinaryId" DROP NOT NULL;

-- Drop the unique constraint on cloudinaryId since we're moving to storage_path
ALTER TABLE "public"."File" DROP CONSTRAINT IF EXISTS "File_cloudinaryId_key";
