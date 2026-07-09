-- Add per-site document template / branding configuration
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS document_template_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sites.document_template_config IS
  'Branding documenti per-site: mittente, banca, logo, colori, condizioni default';
