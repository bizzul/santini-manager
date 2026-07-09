-- Aggiunge il logo del cliente (URL pubblico su storage document-assets)
ALTER TABLE "public"."Client"
  ADD COLUMN IF NOT EXISTS "logoUrl" "text";

COMMENT ON COLUMN "public"."Client"."logoUrl" IS 'URL pubblico del logo del cliente (bucket document-assets, path {site_id}/clients/{client_id}/logo.*)';
