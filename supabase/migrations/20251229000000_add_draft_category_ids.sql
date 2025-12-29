-- =====================================================
-- Migration: Add draft_category_ids field for offer quick add
-- Purpose: Store selected category IDs when creating a draft offer
--          So that when completing the draft, only products from
--          those categories are shown as selectable
-- =====================================================

-- Add draft_category_ids column to Task table
-- This stores an array of category IDs selected during draft creation
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "draft_category_ids" INTEGER[] DEFAULT NULL;

-- Add index for efficient queries on draft category IDs
CREATE INDEX IF NOT EXISTS "idx_task_draft_category_ids" ON "public"."Task" USING GIN ("draft_category_ids");

-- Comment for documentation
COMMENT ON COLUMN "public"."Task"."draft_category_ids" IS 'Array of sellproduct_categories IDs selected during draft offer creation. Used to filter products when completing the draft.';

