-- Add service schedule window and collaborators to Task
ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "service_data_inizio" DATE,
  ADD COLUMN IF NOT EXISTS "service_data_fine" DATE,
  ADD COLUMN IF NOT EXISTS "service_ora_inizio" TIME,
  ADD COLUMN IF NOT EXISTS "service_ora_fine" TIME,
  ADD COLUMN IF NOT EXISTS "service_collaborator_ids" JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."Task"."service_data_inizio" IS 'Data inizio assistenza/service';
COMMENT ON COLUMN "public"."Task"."service_data_fine" IS 'Data fine assistenza/service';
COMMENT ON COLUMN "public"."Task"."service_ora_inizio" IS 'Ora inizio assistenza/service';
COMMENT ON COLUMN "public"."Task"."service_ora_fine" IS 'Ora fine assistenza/service';
COMMENT ON COLUMN "public"."Task"."service_collaborator_ids" IS 'Collaboratori assegnati al service (User.id)';
