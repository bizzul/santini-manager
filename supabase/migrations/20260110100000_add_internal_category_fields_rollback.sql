-- Rollback: Remove internal category fields from KanbanCategory

-- Remove the new unique constraint (try both constraint and index)
ALTER TABLE "code_sequences" DROP CONSTRAINT IF EXISTS "code_sequences_unique";
DROP INDEX IF EXISTS "code_sequences_unique";

-- Remove category_id from code_sequences
ALTER TABLE "code_sequences" 
DROP COLUMN IF EXISTS "category_id";

-- Recreate the original unique constraint (if needed)
-- Note: Check your original constraint name
CREATE UNIQUE INDEX IF NOT EXISTS "code_sequences_site_type_year_key" 
ON "code_sequences" (site_id, sequence_type, year);

-- Remove constraint from KanbanCategory
ALTER TABLE "KanbanCategory" 
DROP CONSTRAINT IF EXISTS "kanban_category_internal_base_check";

-- Remove unique index
DROP INDEX IF EXISTS "kanban_category_internal_base_unique";

-- Remove columns from KanbanCategory
ALTER TABLE "KanbanCategory" 
DROP COLUMN IF EXISTS "internal_base_code";

ALTER TABLE "KanbanCategory" 
DROP COLUMN IF EXISTS "is_internal";
