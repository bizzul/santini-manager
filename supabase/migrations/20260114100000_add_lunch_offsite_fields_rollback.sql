-- Rollback: Remove lunch off-site fields from Timetracking table

ALTER TABLE "public"."Timetracking"
DROP COLUMN IF EXISTS "lunch_offsite";

ALTER TABLE "public"."Timetracking"
DROP COLUMN IF EXISTS "lunch_location";
