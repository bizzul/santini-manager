ALTER TABLE "public"."Client"
ADD COLUMN IF NOT EXISTS "contactPeople" jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "public"."Client"."contactPeople" IS
'Elenco dei referenti del cliente con ruolo, email e telefono';
