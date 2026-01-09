-- Rollback: Remove internal activity support from Timetracking table

-- Remove constraints first
ALTER TABLE "public"."Timetracking" 
DROP CONSTRAINT IF EXISTS "timetracking_activity_consistency_check";

ALTER TABLE "public"."Timetracking" 
DROP CONSTRAINT IF EXISTS "timetracking_activity_type_check";

-- Remove columns
ALTER TABLE "public"."Timetracking" 
DROP COLUMN IF EXISTS "internal_activity";

ALTER TABLE "public"."Timetracking" 
DROP COLUMN IF EXISTS "activity_type";
