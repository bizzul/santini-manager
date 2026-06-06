-- Descrizione estesa (testo libero) per riga documento
ALTER TABLE public.righe_documento
  ADD COLUMN IF NOT EXISTS descrizione_estesa text;

COMMENT ON COLUMN public.righe_documento.descrizione_estesa IS 'Descrizione completa in testo libero, opzionale, mostrata sotto la descrizione breve';
