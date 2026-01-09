-- Rollback: Remove code_change_column_id from Kanban table

ALTER TABLE "Kanban" DROP COLUMN IF EXISTS "code_change_column_id";
