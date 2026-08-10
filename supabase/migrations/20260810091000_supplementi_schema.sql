-- Fase 2 (struttura) — Tabella Supplementi (Spazio Santini / FDM)
-- Progetto: Full Data Manager. Pattern RLS: tm_* / ev_* con user_can_access_site(site_id).
--
-- Entita trasversale per sovrapprezzi opzionali applicabili a un prodotto configurato.
-- SOLO struttura: nessun dato reale (i supplementi arriveranno come dati, categoria per
-- categoria, in un secondo momento). Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).

BEGIN;

-- ---------------------------------------------------------------------------
-- supplementi — anagrafica sovrapprezzi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplementi (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  codice       text NOT NULL,
  nome         text NOT NULL,
  descrizione  text,
  tipo_calcolo text NOT NULL,
  valore       numeric(12,4) NOT NULL DEFAULT 0,
  attivo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplementi_tipo_calcolo_check
    CHECK (tipo_calcolo IN ('fisso_chf', 'percentuale', 'per_mq', 'per_metro_lineare')),
  CONSTRAINT supplementi_site_codice_unique UNIQUE (site_id, codice)
);

CREATE INDEX IF NOT EXISTS idx_supplementi_site_attivo
  ON public.supplementi (site_id) WHERE attivo;

DROP TRIGGER IF EXISTS supplementi_set_updated_at ON public.supplementi;
CREATE TRIGGER supplementi_set_updated_at
  BEFORE UPDATE ON public.supplementi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- supplementi_categorie — tabella ponte supplemento <-> categoria prodotto
-- Un supplemento puo applicarsi a piu categorie (o a 'tutte').
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplementi_categorie (
  supplemento_id uuid NOT NULL REFERENCES public.supplementi(id) ON DELETE CASCADE,
  categoria      text NOT NULL,
  CONSTRAINT supplementi_categorie_pkey PRIMARY KEY (supplemento_id, categoria),
  CONSTRAINT supplementi_categorie_categoria_check
    CHECK (categoria IN ('Arredamento', 'Porte', 'Serramenti', 'Accessori', 'Posa', 'Service', 'tutte'))
);

CREATE INDEX IF NOT EXISTS idx_supplementi_categorie_categoria
  ON public.supplementi_categorie (categoria);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.supplementi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplementi_select_site_access ON public.supplementi;
DROP POLICY IF EXISTS supplementi_insert_site_access ON public.supplementi;
DROP POLICY IF EXISTS supplementi_update_site_access ON public.supplementi;
DROP POLICY IF EXISTS supplementi_delete_site_access ON public.supplementi;
CREATE POLICY supplementi_select_site_access ON public.supplementi
  FOR SELECT TO authenticated USING (public.user_can_access_site(site_id));
CREATE POLICY supplementi_insert_site_access ON public.supplementi
  FOR INSERT TO authenticated WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY supplementi_update_site_access ON public.supplementi
  FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY supplementi_delete_site_access ON public.supplementi
  FOR DELETE TO authenticated USING (public.user_can_access_site(site_id));

-- Tabella ponte senza site_id: autorizza tramite il site del supplemento padre.
ALTER TABLE public.supplementi_categorie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplementi_categorie_site_all ON public.supplementi_categorie;
CREATE POLICY supplementi_categorie_site_all ON public.supplementi_categorie
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplementi s
      WHERE s.id = supplementi_categorie.supplemento_id
        AND public.user_can_access_site(s.site_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplementi s
      WHERE s.id = supplementi_categorie.supplemento_id
        AND public.user_can_access_site(s.site_id)
    )
  );

GRANT ALL ON TABLE public.supplementi TO anon;
GRANT ALL ON TABLE public.supplementi TO authenticated;
GRANT ALL ON TABLE public.supplementi TO service_role;
GRANT ALL ON TABLE public.supplementi_categorie TO anon;
GRANT ALL ON TABLE public.supplementi_categorie TO authenticated;
GRANT ALL ON TABLE public.supplementi_categorie TO service_role;

COMMIT;

-- Report RLS (verifica post-migration):
-- supplementi           | ON | select/insert/update/delete | basso | site_id
-- supplementi_categorie | ON | all (via parent site)       | basso | supplemento_id -> supplementi.site_id
