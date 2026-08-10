-- Fase 3 (raffinamento) — aggiunge la modalita prezzo 'mc' (metro cubo / volume)
-- per l'arredamento, oltre a 'mq'. La profondita arriva dal configuratore riga;
-- se assente il motore ripiega sul calcolo a mq.
--
-- Idempotente: drop + re-add del CHECK constraint.

BEGIN;

ALTER TABLE public."SellProduct"
  DROP CONSTRAINT IF EXISTS "SellProduct_modalita_prezzo_check";

ALTER TABLE public."SellProduct"
  ADD CONSTRAINT "SellProduct_modalita_prezzo_check"
  CHECK ("modalita_prezzo" IN ('griglia', 'misure_standard', 'fisso', 'mq', 'mc'));

COMMENT ON COLUMN public."SellProduct"."modalita_prezzo" IS
  'Modalita di calcolo prezzo: griglia | misure_standard | fisso | mq | mc. NULL per prodotti legacy senza modalita.';

COMMIT;
