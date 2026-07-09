-- Migration: Add project folder URL fields to Task table
-- Description: Adds fields to store URLs for cloud project folders and project files folders

-- Add cloud_folder_url field
ALTER TABLE "public"."Task" 
  ADD COLUMN IF NOT EXISTS "cloud_folder_url" text;

-- Add project_files_url field
ALTER TABLE "public"."Task" 
  ADD COLUMN IF NOT EXISTS "project_files_url" text;

-- Add comments for documentation
COMMENT ON COLUMN "public"."Task"."cloud_folder_url" IS 'URL to cloud folder for project documents';
COMMENT ON COLUMN "public"."Task"."project_files_url" IS 'URL to folder containing project files';
