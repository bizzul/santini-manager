-- Estende le categorie di coefficiente (esecuzione ante, tipo cassone) e aggiunge
-- l'attributo cod_tipo_cassone su SellProduct (per gli Armadi "cassone").
-- Solo struttura: nessun valore numerico. Idempotente.

BEGIN;

-- Nuove categorie coefficiente: esecuzione_ante, tipo_cassone
ALTER TABLE public.listino_coefficienti
  DROP CONSTRAINT IF EXISTS listino_coefficienti_categoria_check;

ALTER TABLE public.listino_coefficienti
  ADD CONSTRAINT listino_coefficienti_categoria_check
  CHECK (categoria IN (
    'materiale_serramento',
    'vetro',
    'materiale_porta',
    'telaio',
    'esecuzione_ante',
    'tipo_cassone'
  ));

-- Attributo fisso del prodotto cassone: identifica il tipo (1:1 con i coeff tipo_cassone)
ALTER TABLE public."SellProduct"
  ADD COLUMN IF NOT EXISTS "cod_tipo_cassone" text;

COMMENT ON COLUMN public."SellProduct"."cod_tipo_cassone" IS
  'Codice tipo cassone (Armadi ARM_CASSONE). Collega al coefficiente listino_coefficienti categoria=tipo_cassone.';

COMMIT;
