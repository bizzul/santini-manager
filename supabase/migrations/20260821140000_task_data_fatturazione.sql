-- Data di fatturazione sulla scheda progetto.
-- Idempotente. Se la colonna non c'e', l'app omette il campo al salvataggio.

BEGIN;

ALTER TABLE public."Task"
  ADD COLUMN IF NOT EXISTS data_fatturazione date;

COMMENT ON COLUMN public."Task".data_fatturazione IS
  'Data di fatturazione prevista/registrata sulla scheda progetto.';

COMMIT;
