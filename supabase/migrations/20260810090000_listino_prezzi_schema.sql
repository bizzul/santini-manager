-- Fase 1 — Schema listino prezzi unificato (Spazio Santini / FDM)
-- Progetto: Full Data Manager. Pattern RLS: tm_* / ev_* con user_can_access_site(site_id).
--
-- Consolida lo schema di pricing tabellare in 4 tabelle + 2 colonne su "SellProduct".
-- Nessun seed di prezzi: solo struttura. Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- Mapping naming reale (vs. documento di piano):
--   prodotti      -> "SellProduct"
--   prodotto_cod  -> "SellProduct".internal_code (COD_INT) per lookup;
--                    FK stabile = sell_product_id -> "SellProduct"(id)
--   multi-tenant  -> site_id + user_can_access_site(site_id)

BEGIN;

-- ---------------------------------------------------------------------------
-- Colonne di modalita prezzo su "SellProduct"
-- ---------------------------------------------------------------------------
ALTER TABLE public."SellProduct"
  ADD COLUMN IF NOT EXISTS "modalita_prezzo" text,
  ADD COLUMN IF NOT EXISTS "famiglia_apertura_cod" text;

DO $$ BEGIN
  ALTER TABLE public."SellProduct"
    ADD CONSTRAINT "SellProduct_modalita_prezzo_check"
    CHECK ("modalita_prezzo" IN ('griglia', 'misure_standard', 'fisso', 'mq'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public."SellProduct"."modalita_prezzo" IS
  'Modalita di calcolo prezzo: griglia | misure_standard | fisso | mq. NULL per prodotti legacy senza modalita.';
COMMENT ON COLUMN public."SellProduct"."famiglia_apertura_cod" IS
  'Codice famiglia apertura per prodotti a griglia (es. FIN_SING, FIN_DOP, SCO, SCO_HS, PFI_SING, PFI_DOP, POR_SUMISURA). Collega a listino_griglia_base.';

CREATE INDEX IF NOT EXISTS "SellProduct_famiglia_apertura_cod_idx"
  ON public."SellProduct" USING btree ("site_id", "famiglia_apertura_cod")
  WHERE "famiglia_apertura_cod" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- listino_griglia_base — fasce dimensionali x famiglia apertura, prezzo base
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listino_griglia_base (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  famiglia_apertura_cod text NOT NULL,
  larghezza_min_mm      integer NOT NULL,
  larghezza_max_mm      integer NOT NULL,
  altezza_min_mm        integer NOT NULL,
  altezza_max_mm        integer NOT NULL,
  prezzo_base_chf       numeric(12,2) NOT NULL,
  attivo                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listino_griglia_base_larghezza_range CHECK (larghezza_max_mm >= larghezza_min_mm),
  CONSTRAINT listino_griglia_base_altezza_range CHECK (altezza_max_mm >= altezza_min_mm)
);

CREATE INDEX IF NOT EXISTS idx_listino_griglia_base_site_famiglia
  ON public.listino_griglia_base (site_id, famiglia_apertura_cod);

DROP TRIGGER IF EXISTS listino_griglia_base_set_updated_at ON public.listino_griglia_base;
CREATE TRIGGER listino_griglia_base_set_updated_at
  BEFORE UPDATE ON public.listino_griglia_base
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listino_coefficienti — moltiplicatori materiale/vetro/telaio
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listino_coefficienti (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  categoria     text NOT NULL,
  codice        text NOT NULL,
  descrizione   text,
  moltiplicatore numeric(8,4) NOT NULL DEFAULT 1.0000,
  attivo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listino_coefficienti_categoria_check
    CHECK (categoria IN ('materiale_serramento', 'vetro', 'materiale_porta', 'telaio')),
  CONSTRAINT listino_coefficienti_site_categoria_codice_unique
    UNIQUE (site_id, categoria, codice)
);

CREATE INDEX IF NOT EXISTS idx_listino_coefficienti_site_categoria
  ON public.listino_coefficienti (site_id, categoria);

DROP TRIGGER IF EXISTS listino_coefficienti_set_updated_at ON public.listino_coefficienti;
CREATE TRIGGER listino_coefficienti_set_updated_at
  BEFORE UPDATE ON public.listino_coefficienti
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listino_misure_standard — porte / prodotti a taglie fisse
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listino_misure_standard (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  sell_product_id integer NOT NULL REFERENCES public."SellProduct"(id) ON DELETE CASCADE,
  larghezza_mm    integer NOT NULL,
  altezza_mm      integer NOT NULL,
  prezzo_chf      numeric(12,2) NOT NULL,
  attivo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listino_misure_standard_site_prodotto_misura_unique
    UNIQUE (site_id, sell_product_id, larghezza_mm, altezza_mm)
);

CREATE INDEX IF NOT EXISTS idx_listino_misure_standard_prodotto
  ON public.listino_misure_standard (sell_product_id);

DROP TRIGGER IF EXISTS listino_misure_standard_set_updated_at ON public.listino_misure_standard;
CREATE TRIGGER listino_misure_standard_set_updated_at
  BEFORE UPDATE ON public.listino_misure_standard
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listino_fisso — accessori / posa / service a prezzo fisso
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listino_fisso (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  sell_product_id integer NOT NULL REFERENCES public."SellProduct"(id) ON DELETE CASCADE,
  prezzo_chf      numeric(12,2) NOT NULL,
  attivo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listino_fisso_site_prodotto_unique UNIQUE (site_id, sell_product_id)
);

CREATE INDEX IF NOT EXISTS idx_listino_fisso_prodotto
  ON public.listino_fisso (sell_product_id);

DROP TRIGGER IF EXISTS listino_fisso_set_updated_at ON public.listino_fisso;
CREATE TRIGGER listino_fisso_set_updated_at
  BEFORE UPDATE ON public.listino_fisso
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — pattern user_can_access_site(site_id) su tutte le tabelle listino
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := array[
    'listino_griglia_base',
    'listino_coefficienti',
    'listino_misure_standard',
    'listino_fisso'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_site_access', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_site_access', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_site_access', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_site_access', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.user_can_access_site(site_id))',
      t || '_select_site_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.user_can_access_site(site_id))',
      t || '_insert_site_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.user_can_access_site(site_id)) WITH CHECK (public.user_can_access_site(site_id))',
      t || '_update_site_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.user_can_access_site(site_id))',
      t || '_delete_site_access', t);

    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

COMMIT;

-- Report RLS (verifica post-migration):
-- listino_griglia_base    | ON | select/insert/update/delete | basso | site_id
-- listino_coefficienti    | ON | select/insert/update/delete | basso | site_id
-- listino_misure_standard | ON | select/insert/update/delete | basso | site_id
-- listino_fisso           | ON | select/insert/update/delete | basso | site_id
