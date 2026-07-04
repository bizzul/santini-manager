-- Dimensioni opzionali per le schede prodotto (es. tubi rivestiti in vetro):
-- diametro e lunghezza in millimetri. Campi facoltativi, nessun impatto
-- sui prodotti esistenti degli altri siti.
ALTER TABLE "public"."SellProduct"
  ADD COLUMN IF NOT EXISTS "diameter_mm" numeric,
  ADD COLUMN IF NOT EXISTS "length_mm" numeric;

COMMENT ON COLUMN "public"."SellProduct"."diameter_mm" IS 'Diametro del prodotto in millimetri (opzionale)';
COMMENT ON COLUMN "public"."SellProduct"."length_mm" IS 'Lunghezza del prodotto in millimetri (opzionale)';
