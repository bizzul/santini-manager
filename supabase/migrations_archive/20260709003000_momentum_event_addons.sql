-- =====================================================
-- Momentum: add-on campi eventi
--  - senza_data: evento "flottante" senza data fissa (data_evento resta NULL)
--  - volo_brandizzato: add-on parapendio/drone con sponsor brandizzato
--  - immagine_url: cover immagine per tipologia evento
-- =====================================================

ALTER TABLE public.ev_eventi
  ADD COLUMN IF NOT EXISTS senza_data boolean NOT NULL DEFAULT false;

ALTER TABLE public.ev_eventi
  ADD COLUMN IF NOT EXISTS volo_brandizzato boolean NOT NULL DEFAULT false;

ALTER TABLE public.ev_eventi
  ADD COLUMN IF NOT EXISTS immagine_url text;
