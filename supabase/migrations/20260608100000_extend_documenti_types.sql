-- Estende documenti per tipi multipli, corpo prosa, PDF e allegati

ALTER TABLE public.documenti
DROP CONSTRAINT IF EXISTS documenti_tipo_documento_check;

ALTER TABLE public.documenti
ADD COLUMN IF NOT EXISTS corpo_testo text,
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS pdf_storage_path text,
ADD COLUMN IF NOT EXISTS allegati jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.documenti.corpo_testo IS 'Corpo prosa per lettere e comunicazioni';
COMMENT ON COLUMN public.documenti.pdf_url IS 'URL pubblico del PDF generato';
COMMENT ON COLUMN public.documenti.pdf_storage_path IS 'Path nel bucket documents';
COMMENT ON COLUMN public.documenti.allegati IS 'Array JSON allegati: [{name, url, storage_path, size}]';
