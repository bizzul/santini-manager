-- Nuovo meccanismo di prezzo: incrementi dimensionali (termine additivo)
--
-- Si applica IN AGGIUNTA a griglia/coefficienti esistenti, non li sostituisce.
-- Formula (nel motore): prezzo_extra = ((valore_mm - valore_riferimento_mm) /
--   incremento_mm) x prezzo_per_incremento_chf  (limitato a >= 0).
-- Caso d'uso: profondita 300-600mm degli Armadi (famiglia ARM_CASSONE), gestita
-- SOLO qui e non nella griglia. Idempotente. Pattern RLS user_can_access_site.

BEGIN;

CREATE TABLE IF NOT EXISTS public.listino_incrementi_dimensionali (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                   uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  famiglia_prodotto_cod     text NOT NULL,
  dimensione                text NOT NULL,
  valore_riferimento_mm     integer NOT NULL,
  incremento_mm             integer NOT NULL,
  prezzo_per_incremento_chf numeric(12,2) NOT NULL,
  attivo                    boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listino_incrementi_dimensione_check
    CHECK (dimensione IN ('larghezza', 'altezza', 'profondita')),
  CONSTRAINT listino_incrementi_incremento_positivo
    CHECK (incremento_mm > 0)
);

CREATE INDEX IF NOT EXISTS idx_listino_incrementi_site_famiglia
  ON public.listino_incrementi_dimensionali (site_id, famiglia_prodotto_cod, dimensione);

DROP TRIGGER IF EXISTS listino_incrementi_dimensionali_set_updated_at
  ON public.listino_incrementi_dimensionali;
CREATE TRIGGER listino_incrementi_dimensionali_set_updated_at
  BEFORE UPDATE ON public.listino_incrementi_dimensionali
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.listino_incrementi_dimensionali IS
  'Termine additivo di prezzo per scostamento dimensionale rispetto a un valore di riferimento (es. profondita Armadi ARM_CASSONE).';

-- RLS coerente con le altre tabelle listino
ALTER TABLE public.listino_incrementi_dimensionali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listino_incrementi_dimensionali_select_site_access ON public.listino_incrementi_dimensionali;
DROP POLICY IF EXISTS listino_incrementi_dimensionali_insert_site_access ON public.listino_incrementi_dimensionali;
DROP POLICY IF EXISTS listino_incrementi_dimensionali_update_site_access ON public.listino_incrementi_dimensionali;
DROP POLICY IF EXISTS listino_incrementi_dimensionali_delete_site_access ON public.listino_incrementi_dimensionali;

CREATE POLICY listino_incrementi_dimensionali_select_site_access
  ON public.listino_incrementi_dimensionali FOR SELECT TO authenticated
  USING (public.user_can_access_site(site_id));
CREATE POLICY listino_incrementi_dimensionali_insert_site_access
  ON public.listino_incrementi_dimensionali FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY listino_incrementi_dimensionali_update_site_access
  ON public.listino_incrementi_dimensionali FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY listino_incrementi_dimensionali_delete_site_access
  ON public.listino_incrementi_dimensionali FOR DELETE TO authenticated
  USING (public.user_can_access_site(site_id));

GRANT ALL ON TABLE public.listino_incrementi_dimensionali TO anon;
GRANT ALL ON TABLE public.listino_incrementi_dimensionali TO authenticated;
GRANT ALL ON TABLE public.listino_incrementi_dimensionali TO service_role;

COMMIT;
