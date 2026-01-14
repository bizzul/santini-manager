-- Migration: Add notes field to TaskSupplier table
-- Description: Allows adding notes to each supplier order in a task

ALTER TABLE "public"."TaskSupplier" ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "public"."TaskSupplier".notes IS 'Notes for this supplier order';
