-- Migration: Add source_offer_code field to Task table
-- This field stores the original offer code when a task is duplicated from an offer to work kanban

ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "source_offer_code" TEXT;

COMMENT ON COLUMN "public"."Task"."source_offer_code" 
IS 'Codice offerta originale da cui deriva questo lavoro';

-- Index for faster lookups by source offer code
CREATE INDEX IF NOT EXISTS "idx_task_source_offer_code" ON "public"."Task" ("source_offer_code");
