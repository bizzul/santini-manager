-- Migration: Add internal activity support to Timetracking table
-- This allows users to log time for internal activities (cleaning, maintenance, etc.)
-- without requiring a linked task/project

-- Add activity_type column to distinguish between project-based and internal activities
ALTER TABLE "public"."Timetracking" 
ADD COLUMN IF NOT EXISTS "activity_type" VARCHAR(20) DEFAULT 'project';

-- Add internal_activity column to store the type of internal activity
ALTER TABLE "public"."Timetracking" 
ADD COLUMN IF NOT EXISTS "internal_activity" VARCHAR(50);

-- Make task_id nullable (it was already nullable but we ensure it)
ALTER TABLE "public"."Timetracking" 
ALTER COLUMN "task_id" DROP NOT NULL;

-- Add comment to document the columns
COMMENT ON COLUMN "public"."Timetracking"."activity_type" IS 'Type of activity: project (linked to task) or internal (standalone)';
COMMENT ON COLUMN "public"."Timetracking"."internal_activity" IS 'Type of internal activity: pulizie, manutenzione, logistica, inventario, formazione, riunione, altro';

-- Add check constraint to ensure valid activity types
ALTER TABLE "public"."Timetracking"
ADD CONSTRAINT "timetracking_activity_type_check" 
CHECK (activity_type IN ('project', 'internal'));

-- Add check constraint to ensure internal_activity is set when activity_type is 'internal'
-- and task_id is set when activity_type is 'project'
ALTER TABLE "public"."Timetracking"
ADD CONSTRAINT "timetracking_activity_consistency_check"
CHECK (
  (activity_type = 'project' AND task_id IS NOT NULL) OR
  (activity_type = 'internal' AND internal_activity IS NOT NULL)
);
