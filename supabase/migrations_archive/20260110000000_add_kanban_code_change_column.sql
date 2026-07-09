-- Migration: Add code_change_column_id to Kanban table
-- Purpose: Allow offer kanbans to specify which column triggers the unique_code change from OFFERTA to LAVORO

-- Add the column to Kanban table
ALTER TABLE "Kanban" ADD COLUMN IF NOT EXISTS "code_change_column_id" integer;

-- Add foreign key constraint (optional, referencing KanbanColumn)
-- Note: We don't add a strict foreign key because the column might be deleted
-- and we want to handle that gracefully in the application logic

-- Add comment for documentation
COMMENT ON COLUMN "Kanban"."code_change_column_id" IS 'ID of the column that triggers unique_code change from OFFERTA to LAVORO format';
