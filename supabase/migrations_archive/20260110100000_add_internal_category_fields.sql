-- Migration: Add internal category fields to KanbanCategory
-- Purpose: Allow categories to be marked as "internal" with unique base codes for project numbering

-- =====================================================
-- Step 1: Add new columns to KanbanCategory
-- =====================================================

-- Add is_internal flag
ALTER TABLE "KanbanCategory" 
ADD COLUMN IF NOT EXISTS "is_internal" BOOLEAN DEFAULT FALSE;

-- Add internal_base_code for the project numbering prefix
ALTER TABLE "KanbanCategory" 
ADD COLUMN IF NOT EXISTS "internal_base_code" INTEGER;

-- =====================================================
-- Step 2: Add constraints
-- =====================================================

-- Constraint: base_code is required when is_internal = true
ALTER TABLE "KanbanCategory" 
ADD CONSTRAINT "kanban_category_internal_base_check" 
CHECK (is_internal = FALSE OR internal_base_code IS NOT NULL);

-- Constraint: base_code must be unique per site (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS "kanban_category_internal_base_unique" 
ON "KanbanCategory" (site_id, internal_base_code) 
WHERE internal_base_code IS NOT NULL;

-- =====================================================
-- Step 3: Extend code_sequences for category-specific sequences
-- =====================================================

-- Add category_id to support per-category sequences
ALTER TABLE "code_sequences" 
ADD COLUMN IF NOT EXISTS "category_id" INTEGER REFERENCES "KanbanCategory"(id) ON DELETE CASCADE;

-- Drop existing unique constraint if it exists (try both constraint and index)
ALTER TABLE "code_sequences" DROP CONSTRAINT IF EXISTS "code_sequences_unique";
ALTER TABLE "code_sequences" DROP CONSTRAINT IF EXISTS "code_sequences_site_type_year_key";
DROP INDEX IF EXISTS "code_sequences_unique";
DROP INDEX IF EXISTS "code_sequences_site_type_year_key";

-- Create new unique constraint that includes category_id
-- Using COALESCE to handle NULL category_id (for standard codes)
CREATE UNIQUE INDEX "code_sequences_unique" 
ON "code_sequences" (site_id, sequence_type, year, COALESCE(category_id, -1));

-- =====================================================
-- Step 4: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN "KanbanCategory"."is_internal" IS 'If true, this category uses internal project numbering (e.g., 1000-1, 1000-2)';
COMMENT ON COLUMN "KanbanCategory"."internal_base_code" IS 'Base code for internal project numbers (e.g., 1000 for Marketing, 2000 for R&D)';
COMMENT ON COLUMN "code_sequences"."category_id" IS 'Reference to KanbanCategory for internal project sequences';
