-- Migration: Fix Kanban and KanbanColumn unique constraints to allow same identifiers across different sites
-- 
-- Problem: Current unique constraints are global, preventing different sites from having
-- kanban boards or columns with the same identifier.
--
-- Solution:
-- 1. Kanban: Change UNIQUE(identifier) to UNIQUE(site_id, identifier)
-- 2. KanbanColumn: Change UNIQUE(identifier) to UNIQUE(kanbanId, identifier)
--
-- This allows each site to have its own set of kanban boards with independent identifiers,
-- and each kanban board to have its own set of columns with independent identifiers.

-- =====================================================
-- Step 1: Drop existing unique constraints
-- =====================================================

-- Drop the old Kanban identifier unique constraint
ALTER TABLE "public"."Kanban" 
DROP CONSTRAINT IF EXISTS "Kanban_identifier_key";

-- Drop the old KanbanColumn identifier unique constraint
ALTER TABLE "public"."KanbanColumn" 
DROP CONSTRAINT IF EXISTS "KanbanColumn_identifier_key";

-- =====================================================
-- Step 2: Create new composite unique constraints
-- =====================================================

-- Create new Kanban constraint: unique identifier per site
-- Note: site_id can be NULL for legacy kanbans, so we need to handle that
ALTER TABLE "public"."Kanban"
ADD CONSTRAINT "Kanban_site_id_identifier_key" UNIQUE ("site_id", "identifier");

-- Create new KanbanColumn constraint: unique identifier per kanban
ALTER TABLE "public"."KanbanColumn"
ADD CONSTRAINT "KanbanColumn_kanbanId_identifier_key" UNIQUE ("kanbanId", "identifier");

-- =====================================================
-- Step 3: Create indexes for better query performance
-- =====================================================

-- Index for Kanban lookups by site_id and identifier (most common query pattern)
CREATE INDEX IF NOT EXISTS "idx_kanban_site_identifier" 
ON "public"."Kanban" ("site_id", "identifier");

-- Index for KanbanColumn lookups by kanbanId (already covered by the unique constraint, but explicit for clarity)
CREATE INDEX IF NOT EXISTS "idx_kanbancolumn_kanbanid" 
ON "public"."KanbanColumn" ("kanbanId");

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON CONSTRAINT "Kanban_site_id_identifier_key" ON "public"."Kanban" 
IS 'Ensures kanban identifiers are unique within each site. Different sites can have kanbans with the same identifier.';

COMMENT ON CONSTRAINT "KanbanColumn_kanbanId_identifier_key" ON "public"."KanbanColumn" 
IS 'Ensures column identifiers are unique within each kanban board. Different kanbans can have columns with the same identifier.';

