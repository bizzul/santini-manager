-- Migration: Add addressSecondary field to Client table
-- Description: Allows adding a secondary address line (c/o, floor, etc.) to clients

ALTER TABLE "public"."Client" ADD COLUMN IF NOT EXISTS "addressSecondary" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "public"."Client"."addressSecondary" IS 'Secondary address line (c/o, floor, apartment, etc.)';
