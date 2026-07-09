-- Migration: Make Errortracking.position optional (nullable)
-- Le posizioni non devono essere obbligatorie

ALTER TABLE "public"."Errortracking"
ALTER COLUMN "position" DROP NOT NULL;

COMMENT ON COLUMN "public"."Errortracking"."position" IS 'Posizione (opzionale)';
