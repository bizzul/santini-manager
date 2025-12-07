-- Migration: Add production fields to Task table
-- Adds: numero_pezzi, termine_produzione, legno, vernice, altro

-- Add numero_pezzi column (number of pieces)
ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "numero_pezzi" integer;

-- Add termine_produzione column (production deadline)
ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "termine_produzione" timestamp(6) without time zone;

-- Add legno column (wood material flag)
ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "legno" boolean DEFAULT false;

-- Add vernice column (paint material flag)
ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "vernice" boolean DEFAULT false;

-- Add altro column (other material flag)
ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "altro" boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "public"."Task"."numero_pezzi" IS 'Number of pieces for the project';
COMMENT ON COLUMN "public"."Task"."termine_produzione" IS 'Production deadline date';
COMMENT ON COLUMN "public"."Task"."legno" IS 'Wood material required flag';
COMMENT ON COLUMN "public"."Task"."vernice" IS 'Paint material required flag';
COMMENT ON COLUMN "public"."Task"."altro" IS 'Other material required flag';

