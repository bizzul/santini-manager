-- Migration: Add optional fields to Errortracking table
-- Costo materiale (CHF), Tempo impiegato (ore), KM trasferta supplementare

ALTER TABLE "public"."Errortracking"
ADD COLUMN IF NOT EXISTS "material_cost" NUMERIC(10, 2);

ALTER TABLE "public"."Errortracking"
ADD COLUMN IF NOT EXISTS "time_spent_hours" NUMERIC(6, 2);

ALTER TABLE "public"."Errortracking"
ADD COLUMN IF NOT EXISTS "transfer_km" NUMERIC(8, 2);

COMMENT ON COLUMN "public"."Errortracking"."material_cost" IS 'Costo materiale in CHF';
COMMENT ON COLUMN "public"."Errortracking"."time_spent_hours" IS 'Tempo impiegato in ore';
COMMENT ON COLUMN "public"."Errortracking"."transfer_km" IS 'KM trasferta supplementare';
