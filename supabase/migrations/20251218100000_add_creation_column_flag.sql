-- =====================================================
-- Migration: Add is_creation_column flag to KanbanColumn
-- Purpose: Allow configuring which column shows the create button
-- =====================================================

-- Add is_creation_column flag to KanbanColumn table
-- Only one column per kanban should have this flag set to true
ALTER TABLE "public"."KanbanColumn" 
    ADD COLUMN IF NOT EXISTS "is_creation_column" BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN "public"."KanbanColumn"."is_creation_column" IS 'Flag to indicate which column shows the create button. Only one column per kanban should have this set to true.';

-- Set default: first column (position 1) of each kanban as creation column
UPDATE "public"."KanbanColumn" kc
SET is_creation_column = true
WHERE kc.position = 1
AND NOT EXISTS (
    SELECT 1 FROM "public"."KanbanColumn" kc2 
    WHERE kc2."kanbanId" = kc."kanbanId" 
    AND kc2.is_creation_column = true
);

