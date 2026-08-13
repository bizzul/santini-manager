-- Collegamento righe fatturazione al catalogo `supplementi` + dati test.
-- Idempotente. Non modifica il listino esistente oltre insert ON CONFLICT.

BEGIN;

ALTER TABLE public.fatturazione_supplemento_riga
  ADD COLUMN IF NOT EXISTS catalog_supplemento_id uuid
    REFERENCES public.supplementi(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fatturazione_supplemento_riga_catalog_idx
  ON public.fatturazione_supplemento_riga (catalog_supplemento_id)
  WHERE deleted_at IS NULL AND catalog_supplemento_id IS NOT NULL;

COMMENT ON COLUMN public.fatturazione_supplemento_riga.catalog_supplemento_id IS
  'Riferimento opzionale al catalogo supplementi (tipologia scelta dal direttore).';

-- Dati test: tre tipologie fisse in CHF, su tutti gli spazi.
INSERT INTO public.supplementi (site_id, codice, nome, descrizione, tipo_calcolo, valore, attivo)
SELECT
  s.id,
  v.codice,
  v.nome,
  v.descrizione,
  'fisso_chf',
  v.valore,
  true
FROM public.sites s
CROSS JOIN (
  VALUES
    ('TRASP-SUPP', 'Trasporto supplementare', 'Trasporto extra rispetto all''offerta.', 120),
    ('REGIA-OQ', 'Ore a regia operaio qualificato', 'Ora a regia operaio qualificato.', 110),
    ('REGIA-AM', 'Ore a regia aiuto montatore', 'Ora a regia aiuto montatore.', 80)
) AS v(codice, nome, descrizione, valore)
ON CONFLICT (site_id, codice) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descrizione = EXCLUDED.descrizione,
  tipo_calcolo = EXCLUDED.tipo_calcolo,
  valore = EXCLUDED.valore,
  attivo = true;

INSERT INTO public.supplementi_categorie (supplemento_id, categoria)
SELECT s.id, 'tutte'
FROM public.supplementi s
WHERE s.codice IN ('TRASP-SUPP', 'REGIA-OQ', 'REGIA-AM')
ON CONFLICT (supplemento_id, categoria) DO NOTHING;

COMMIT;
