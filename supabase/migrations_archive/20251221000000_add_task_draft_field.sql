-- =====================================================
-- Migration: Add is_draft field for offer quick add
-- Purpose: Track draft offers created via quick add in TODO column
-- =====================================================

-- Add is_draft column to Task table
-- Draft offers are created quickly with minimal info and completed later
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "is_draft" BOOLEAN DEFAULT false;

-- Add index for efficient queries on draft tasks
CREATE INDEX IF NOT EXISTS "idx_task_is_draft" ON "public"."Task" ("is_draft");

-- Comment for documentation
COMMENT ON COLUMN "public"."Task"."is_draft" IS 'Flag for draft offers created via quick add. Draft offers need to be completed before moving out of TODO column.';

