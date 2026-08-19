-- Commenti tipizzati per area sulla scheda progetto (Produzione / Posa / Fatturazione).
-- Idempotente. Se la colonna non c'e', l'app continua a salvare i blocchi in Task.other.

BEGIN;

ALTER TABLE public."Task"
  ADD COLUMN IF NOT EXISTS typed_comments jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public."Task".typed_comments IS
  'Commenti per area: { produzione, posa, fatturazione }.';

COMMIT;
