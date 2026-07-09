-- Migration: Add luogo (location) field to tasks table
-- Description: Adds a location field to track where the task/project will be delivered/installed

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS luogo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tasks.luogo IS 'Location/address where the task/project will be delivered or installed';
