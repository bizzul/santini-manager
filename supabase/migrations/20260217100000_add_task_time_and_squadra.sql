-- Migration: Add ora_inizio, ora_fine, squadra to Task for Posa/Service calendars
-- Used for time-based scheduling (06:00-20:00) and team columns (Squadra 1, Squadra 2)

ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "ora_inizio" TIME;

ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "ora_fine" TIME;

ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "squadra" INTEGER;

-- Constraint: squadra must be 1 or 2 when set
ALTER TABLE "public"."Task"
  DROP CONSTRAINT IF EXISTS "Task_squadra_check";

ALTER TABLE "public"."Task"
  ADD CONSTRAINT "Task_squadra_check" CHECK (squadra IS NULL OR squadra IN (1, 2));

COMMENT ON COLUMN "public"."Task"."ora_inizio" IS 'Ora inizio (per calendari Posa/Service, 06:00-20:00)';
COMMENT ON COLUMN "public"."Task"."ora_fine" IS 'Ora fine (per calendari Posa/Service)';
COMMENT ON COLUMN "public"."Task"."squadra" IS 'Squadra 1 o 2 (per calendari Posa/Service)';
