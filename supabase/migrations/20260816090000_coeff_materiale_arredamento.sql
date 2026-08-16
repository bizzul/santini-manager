-- Aggiunge la categoria di coefficiente 'materiale_arredamento' per il
-- catalogo Arredamento consolidato (rinnovo ago 2026): il materiale del
-- mobile diventa un moltiplicatore di listino come per porte e serramenti.
-- Solo struttura, idempotente.

BEGIN;

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
    'tipo_cassone',
    'materiale_arredamento'
  ));

COMMIT;
