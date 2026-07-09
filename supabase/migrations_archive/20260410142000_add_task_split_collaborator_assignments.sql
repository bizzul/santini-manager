-- Split collaborator assignments between production and posa
ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "produzione_collaborator_ids" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "posa_collaborator_ids" JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."Task"."produzione_collaborator_ids" IS 'Collaboratori assegnati alla produzione (User.id)';
COMMENT ON COLUMN "public"."Task"."posa_collaborator_ids" IS 'Collaboratori assegnati alla posa (User.id)';
