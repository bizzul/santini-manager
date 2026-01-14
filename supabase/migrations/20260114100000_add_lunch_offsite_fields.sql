-- Migration: Add lunch off-site fields to Timetracking table

ALTER TABLE "public"."Timetracking"
ADD COLUMN IF NOT EXISTS "lunch_offsite" BOOLEAN DEFAULT false;

ALTER TABLE "public"."Timetracking"
ADD COLUMN IF NOT EXISTS "lunch_location" TEXT;

-- Add comments
COMMENT ON COLUMN "public"."Timetracking"."lunch_offsite" IS 'Indica se il pranzo è stato fuori sede';
COMMENT ON COLUMN "public"."Timetracking"."lunch_location" IS 'Luogo del pranzo fuori sede';
