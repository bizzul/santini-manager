-- Rollback Migration: Remove production fields from Task table
-- Removes: numero_pezzi, termine_produzione, legno, vernice, altro

ALTER TABLE "public"."Task"
DROP COLUMN IF EXISTS "numero_pezzi";

ALTER TABLE "public"."Task"
DROP COLUMN IF EXISTS "termine_produzione";

ALTER TABLE "public"."Task"
DROP COLUMN IF EXISTS "legno";

ALTER TABLE "public"."Task"
DROP COLUMN IF EXISTS "vernice";

ALTER TABLE "public"."Task"
DROP COLUMN IF EXISTS "altro";

