-- Rollback: Remove notes field from TaskSupplier table

ALTER TABLE "public"."TaskSupplier" DROP COLUMN IF EXISTS notes;
