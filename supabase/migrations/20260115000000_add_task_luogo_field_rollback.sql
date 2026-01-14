-- Rollback: Remove luogo field from tasks table

ALTER TABLE tasks DROP COLUMN IF EXISTS luogo;
