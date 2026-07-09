ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "consuntivo_material_cost" NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "consuntivo_default_hourly_rate" NUMERIC(10, 2) DEFAULT 65;

ALTER TABLE "public"."Task"
ADD COLUMN IF NOT EXISTS "consuntivo_collaborator_rates" JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "public"."Task"."consuntivo_material_cost" IS
'Costo materiale extra inserito manualmente nel consuntivo progetto.';

COMMENT ON COLUMN "public"."Task"."consuntivo_default_hourly_rate" IS
'Tariffa oraria base usata nel consuntivo progetto.';

COMMENT ON COLUMN "public"."Task"."consuntivo_collaborator_rates" IS
'Mappa JSON dei costi orari personalizzati per collaboratore nel consuntivo progetto.';
