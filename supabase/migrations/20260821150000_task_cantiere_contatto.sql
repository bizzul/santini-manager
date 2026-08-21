-- Contatto cantiere sulla scheda progetto (nome e telefono, precompilati dal cliente).
BEGIN;

ALTER TABLE public."Task"
  ADD COLUMN IF NOT EXISTS cantiere_contatto text,
  ADD COLUMN IF NOT EXISTS cantiere_telefono text;

COMMENT ON COLUMN public."Task".cantiere_contatto IS
  'Persona di contatto del cantiere; se vuota si usa il contatto cliente.';

COMMENT ON COLUMN public."Task".cantiere_telefono IS
  'Telefono del contatto cantiere; se vuoto si usa il telefono cliente.';

COMMIT;
