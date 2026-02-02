-- Rollback: Remove addressSecondary field from Client table

ALTER TABLE "public"."Client" DROP COLUMN IF EXISTS "addressSecondary";
