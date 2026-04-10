-- Add schedule windows and assigned collaborators to Task
ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "produzione_data_inizio" DATE,
  ADD COLUMN IF NOT EXISTS "produzione_data_fine" DATE,
  ADD COLUMN IF NOT EXISTS "posa_data_inizio" DATE,
  ADD COLUMN IF NOT EXISTS "posa_data_fine" DATE,
  ADD COLUMN IF NOT EXISTS "produzione_ora_inizio" TIME,
  ADD COLUMN IF NOT EXISTS "produzione_ora_fine" TIME,
  ADD COLUMN IF NOT EXISTS "posa_ora_inizio" TIME,
  ADD COLUMN IF NOT EXISTS "posa_ora_fine" TIME,
  ADD COLUMN IF NOT EXISTS "assigned_collaborator_ids" JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."Task"."produzione_data_inizio" IS 'Data inizio produzione';
COMMENT ON COLUMN "public"."Task"."produzione_data_fine" IS 'Data fine produzione';
COMMENT ON COLUMN "public"."Task"."posa_data_inizio" IS 'Data inizio posa';
COMMENT ON COLUMN "public"."Task"."posa_data_fine" IS 'Data fine posa';
COMMENT ON COLUMN "public"."Task"."produzione_ora_inizio" IS 'Ora inizio produzione';
COMMENT ON COLUMN "public"."Task"."produzione_ora_fine" IS 'Ora fine produzione';
COMMENT ON COLUMN "public"."Task"."posa_ora_inizio" IS 'Ora inizio posa';
COMMENT ON COLUMN "public"."Task"."posa_ora_fine" IS 'Ora fine posa';
COMMENT ON COLUMN "public"."Task"."assigned_collaborator_ids" IS 'Elenco collaboratori assegnati (User.id)';
