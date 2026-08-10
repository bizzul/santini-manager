-- Dimensioni prodotto: larghezza/altezza/profondita (mm)
--
-- Aggiunge tre colonne dimensionali a "SellProduct" affiancando le esistenti
-- diameter_mm / length_mm (che restano per i prodotti lineari/tubolari).
-- Queste misure fungono da default per pre-compilare il configuratore riga
-- (modalita griglia / mq / mc). Idempotente.

BEGIN;

ALTER TABLE public."SellProduct"
  ADD COLUMN IF NOT EXISTS "width_mm"  numeric,
  ADD COLUMN IF NOT EXISTS "height_mm" numeric,
  ADD COLUMN IF NOT EXISTS "depth_mm"  numeric;

COMMENT ON COLUMN public."SellProduct"."width_mm" IS
  'Larghezza del prodotto in millimetri (opzionale). Default per il configuratore.';
COMMENT ON COLUMN public."SellProduct"."height_mm" IS
  'Altezza del prodotto in millimetri (opzionale). Default per il configuratore.';
COMMENT ON COLUMN public."SellProduct"."depth_mm" IS
  'Profondita del prodotto in millimetri (opzionale). Usata dalla modalita mc.';

COMMIT;
