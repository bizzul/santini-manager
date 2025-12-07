-- Rollback Migration: Revert Kanban and KanbanColumn unique constraints
-- 
-- WARNING: This rollback will fail if there are duplicate identifiers across sites.
-- Before running this rollback, ensure no duplicate identifiers exist.

-- =====================================================
-- Step 1: Drop the new composite unique constraints
-- =====================================================

ALTER TABLE "public"."Kanban" 
DROP CONSTRAINT IF EXISTS "Kanban_site_id_identifier_key";

ALTER TABLE "public"."KanbanColumn" 
DROP CONSTRAINT IF EXISTS "KanbanColumn_kanbanId_identifier_key";

-- =====================================================
-- Step 2: Drop the indexes
-- =====================================================

DROP INDEX IF EXISTS "public"."idx_kanban_site_identifier";
DROP INDEX IF EXISTS "public"."idx_kanbancolumn_kanbanid";

-- =====================================================
-- Step 3: Restore original unique constraints
-- =====================================================

-- Restore original Kanban identifier unique constraint
ALTER TABLE "public"."Kanban"
ADD CONSTRAINT "Kanban_identifier_key" UNIQUE ("identifier");

-- Restore original KanbanColumn identifier unique constraint
ALTER TABLE "public"."KanbanColumn"
ADD CONSTRAINT "KanbanColumn_identifier_key" UNIQUE ("identifier");

