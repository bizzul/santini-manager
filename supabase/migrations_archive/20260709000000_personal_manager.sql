-- =====================================================
-- Personal Manager (Wheel of Life) module
-- Tabelle pm_* per lo spazio "Manager Personale" mobile-first.
-- Dati user-scoped oltre che site-scoped: ogni riga personale e'
-- vincolata a (site_id, user_id). Isolamento tenant + isolamento utente.
-- =====================================================

-- ---------- pm_access (gate Beta per utente) ----------
CREATE TABLE IF NOT EXISTS public.pm_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beta_app_enabled boolean NOT NULL DEFAULT false,
  areas_visible jsonb NOT NULL DEFAULT '[]'::jsonb,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, user_id)
);

-- ---------- pm_life_areas (tassonomia 8 aree, per sito) ----------
CREATE TABLE IF NOT EXISTS public.pm_life_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug IN ('career','finance','family','health','fun','friends','growth','spiritual')),
  label text NOT NULL,
  accent_color text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

-- ---------- pm_area_scores (autovalutazione 0-10, append-only) ----------
CREATE TABLE IF NOT EXISTS public.pm_area_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_slug text NOT NULL CHECK (area_slug IN ('career','finance','family','health','fun','friends','growth','spiritual')),
  score int NOT NULL CHECK (score >= 0 AND score <= 10),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- pm_items (dati fondamentali per area) ----------
CREATE TABLE IF NOT EXISTS public.pm_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_slug text NOT NULL CHECK (area_slug IN ('career','finance','family','health','fun','friends','growth','spiritual')),
  title text NOT NULL,
  notes text,
  priority int NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','postponed')),
  due_date date,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- pm_item_snapshots (storico item, append-only) ----------
CREATE TABLE IF NOT EXISTS public.pm_item_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.pm_items(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  priority int NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- pm_automations (timeline integrazioni) ----------
CREATE TABLE IF NOT EXISTS public.pm_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  area_slug text CHECK (area_slug IN ('career','finance','family','health','fun','friends','growth','spiritual')),
  name text NOT NULL,
  stato text NOT NULL DEFAULT 'previsto' CHECK (stato IN ('previsto','in_integrazione','attivo')),
  data_prevista date,
  data_attivazione date,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- pm_data_sources (sorgenti dati per area) ----------
CREATE TABLE IF NOT EXISTS public.pm_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'internal' CHECK (type IN ('internal','external','wearable','accounting','calendar','manual')),
  area_slug text CHECK (area_slug IN ('career','finance','family','health','fun','friends','growth','spiritual')),
  sync_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK differita: pm_items.source_id -> pm_data_sources (creata dopo pm_data_sources)
-- (pm_data_sources e' definita dopo pm_items: aggiungo il vincolo qui)
ALTER TABLE public.pm_items
  DROP CONSTRAINT IF EXISTS pm_items_source_id_fkey;
ALTER TABLE public.pm_items
  ADD CONSTRAINT pm_items_source_id_fkey
  FOREIGN KEY (source_id) REFERENCES public.pm_data_sources(id) ON DELETE SET NULL;

-- =====================================================
-- Indici
-- =====================================================
CREATE INDEX IF NOT EXISTS pm_access_site_user_idx ON public.pm_access(site_id, user_id);

CREATE INDEX IF NOT EXISTS pm_life_areas_site_id_idx ON public.pm_life_areas(site_id);

CREATE INDEX IF NOT EXISTS pm_area_scores_site_user_idx ON public.pm_area_scores(site_id, user_id);
CREATE INDEX IF NOT EXISTS pm_area_scores_site_user_area_idx ON public.pm_area_scores(site_id, user_id, area_slug);
CREATE INDEX IF NOT EXISTS pm_area_scores_recorded_at_idx ON public.pm_area_scores(recorded_at);

CREATE INDEX IF NOT EXISTS pm_items_site_user_idx ON public.pm_items(site_id, user_id);
CREATE INDEX IF NOT EXISTS pm_items_site_user_area_idx ON public.pm_items(site_id, user_id, area_slug);
CREATE INDEX IF NOT EXISTS pm_items_status_idx ON public.pm_items(status);
CREATE INDEX IF NOT EXISTS pm_items_due_date_idx ON public.pm_items(due_date);

CREATE INDEX IF NOT EXISTS pm_item_snapshots_item_id_idx ON public.pm_item_snapshots(item_id);
CREATE INDEX IF NOT EXISTS pm_item_snapshots_site_user_idx ON public.pm_item_snapshots(site_id, user_id);

CREATE INDEX IF NOT EXISTS pm_automations_site_id_idx ON public.pm_automations(site_id);
CREATE INDEX IF NOT EXISTS pm_automations_stato_idx ON public.pm_automations(stato);

CREATE INDEX IF NOT EXISTS pm_data_sources_site_id_idx ON public.pm_data_sources(site_id);

-- =====================================================
-- updated_at triggers (riuso funzione condivisa public.set_updated_at)
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pm_access_set_updated_at ON public.pm_access;
CREATE TRIGGER pm_access_set_updated_at BEFORE UPDATE ON public.pm_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS pm_life_areas_set_updated_at ON public.pm_life_areas;
CREATE TRIGGER pm_life_areas_set_updated_at BEFORE UPDATE ON public.pm_life_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS pm_items_set_updated_at ON public.pm_items;
CREATE TRIGGER pm_items_set_updated_at BEFORE UPDATE ON public.pm_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS pm_automations_set_updated_at ON public.pm_automations;
CREATE TRIGGER pm_automations_set_updated_at BEFORE UPDATE ON public.pm_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS pm_data_sources_set_updated_at ON public.pm_data_sources;
CREATE TRIGGER pm_data_sources_set_updated_at BEFORE UPDATE ON public.pm_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- Snapshot automatico: registra storico stato/priorita' item
-- =====================================================
CREATE OR REPLACE FUNCTION public.pm_record_item_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.pm_item_snapshots (item_id, site_id, user_id, status, priority)
    VALUES (NEW.id, NEW.site_id, NEW.user_id, NEW.status, NEW.priority);
    RETURN NEW;
  END IF;

  -- UPDATE: registra solo se cambia stato o priorita'
  IF (NEW.status IS DISTINCT FROM OLD.status)
     OR (NEW.priority IS DISTINCT FROM OLD.priority) THEN
    INSERT INTO public.pm_item_snapshots (item_id, site_id, user_id, status, priority)
    VALUES (NEW.id, NEW.site_id, NEW.user_id, NEW.status, NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pm_items_snapshot_insert ON public.pm_items;
CREATE TRIGGER pm_items_snapshot_insert
  AFTER INSERT ON public.pm_items
  FOR EACH ROW EXECUTE FUNCTION public.pm_record_item_snapshot();

DROP TRIGGER IF EXISTS pm_items_snapshot_update ON public.pm_items;
CREATE TRIGGER pm_items_snapshot_update
  AFTER UPDATE OF status, priority ON public.pm_items
  FOR EACH ROW EXECUTE FUNCTION public.pm_record_item_snapshot();

-- =====================================================
-- Seed delle 8 aree (Wheel of Life) per un sito
-- =====================================================
CREATE OR REPLACE FUNCTION public.pm_seed_life_areas(target_site_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pm_life_areas (site_id, slug, label, accent_color, sort_order)
  VALUES
    (target_site_id, 'career',    'Career',               '#F5921B', 1),
    (target_site_id, 'finance',   'Finance',              '#F2C218', 2),
    (target_site_id, 'family',    'Family',               '#57B947', 3),
    (target_site_id, 'health',    'Health',               '#2FBFA4', 4),
    (target_site_id, 'fun',       'Fun & Recreation',     '#39B7E4', 5),
    (target_site_id, 'friends',   'Friends',              '#6E77D8', 6),
    (target_site_id, 'growth',    'Personal Development', '#B061D4', 7),
    (target_site_id, 'spiritual', 'Spiritual',            '#F0736A', 8)
  ON CONFLICT (site_id, slug) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pm_seed_life_areas(uuid) TO authenticated, service_role;

-- Seed per tutti i siti esistenti
DO $$
DECLARE
  s record;
BEGIN
  FOR s IN SELECT id FROM public.sites LOOP
    PERFORM public.pm_seed_life_areas(s.id);
  END LOOP;
END $$;

-- Trigger: seed aree alla creazione di un nuovo sito
CREATE OR REPLACE FUNCTION public.pm_seed_life_areas_on_site()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.pm_seed_life_areas(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pm_seed_life_areas_after_site_insert ON public.sites;
CREATE TRIGGER pm_seed_life_areas_after_site_insert
  AFTER INSERT ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.pm_seed_life_areas_on_site();

-- =====================================================
-- Helper: utente corrente e' superadmin?
-- =====================================================
CREATE OR REPLACE FUNCTION public.pm_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User" u
    WHERE u."authId" = auth.uid()::text
      AND u.role = 'superadmin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.pm_is_superadmin() TO authenticated, service_role;

-- Helper: utente corrente puo' gestire l'accesso Beta del sito (admin/superadmin)
CREATE OR REPLACE FUNCTION public.pm_can_manage_access(target_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.pm_is_superadmin()
    OR (
      public.user_can_access_site(target_site_id)
      AND EXISTS (
        SELECT 1 FROM public."User" u
        WHERE u."authId" = auth.uid()::text
          AND u.role IN ('admin', 'superadmin')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.pm_can_manage_access(uuid) TO authenticated, service_role;

-- =====================================================
-- RLS
-- =====================================================

-- ---- Tabelle personali (site + user scoped) ----
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['pm_area_scores', 'pm_items', 'pm_item_snapshots'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_select_own', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (
        public.user_can_access_site(site_id)
        AND (user_id = auth.uid() OR public.pm_is_superadmin())
      );
    $f$, t || '_select_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_insert_own', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (
        public.user_can_access_site(site_id)
        AND (user_id = auth.uid() OR public.pm_is_superadmin())
      );
    $f$, t || '_insert_own', t);

    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
  END LOOP;
END $$;

-- pm_items e' aggiornabile e cancellabile (soft-delete via update); aggiungo UPDATE/DELETE
DROP POLICY IF EXISTS pm_items_update_own ON public.pm_items;
CREATE POLICY pm_items_update_own ON public.pm_items FOR UPDATE TO authenticated
  USING (
    public.user_can_access_site(site_id)
    AND (user_id = auth.uid() OR public.pm_is_superadmin())
  )
  WITH CHECK (
    public.user_can_access_site(site_id)
    AND (user_id = auth.uid() OR public.pm_is_superadmin())
  );

DROP POLICY IF EXISTS pm_items_delete_own ON public.pm_items;
CREATE POLICY pm_items_delete_own ON public.pm_items FOR DELETE TO authenticated
  USING (
    public.user_can_access_site(site_id)
    AND (user_id = auth.uid() OR public.pm_is_superadmin())
  );
GRANT UPDATE, DELETE ON public.pm_items TO authenticated;

-- ---- pm_access: lettura del proprio record; gestione solo admin/superadmin ----
ALTER TABLE public.pm_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_access_select_own_or_admin ON public.pm_access;
CREATE POLICY pm_access_select_own_or_admin ON public.pm_access FOR SELECT TO authenticated
  USING (
    (public.user_can_access_site(site_id) AND user_id = auth.uid())
    OR public.pm_can_manage_access(site_id)
  );

DROP POLICY IF EXISTS pm_access_insert_admin ON public.pm_access;
CREATE POLICY pm_access_insert_admin ON public.pm_access FOR INSERT TO authenticated
  WITH CHECK (public.pm_can_manage_access(site_id));

DROP POLICY IF EXISTS pm_access_update_admin ON public.pm_access;
CREATE POLICY pm_access_update_admin ON public.pm_access FOR UPDATE TO authenticated
  USING (public.pm_can_manage_access(site_id))
  WITH CHECK (public.pm_can_manage_access(site_id));

DROP POLICY IF EXISTS pm_access_delete_admin ON public.pm_access;
CREATE POLICY pm_access_delete_admin ON public.pm_access FOR DELETE TO authenticated
  USING (public.pm_can_manage_access(site_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_access TO authenticated;
GRANT ALL ON public.pm_access TO service_role;

-- ---- Tabelle di configurazione sito (solo site-scoped) ----
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['pm_life_areas', 'pm_automations', 'pm_data_sources'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_select_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (public.user_can_access_site(site_id));
    $f$, t || '_select_site_access', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_insert_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (public.user_can_access_site(site_id));
    $f$, t || '_insert_site_access', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_update_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
      USING (public.user_can_access_site(site_id))
      WITH CHECK (public.user_can_access_site(site_id));
    $f$, t || '_update_site_access', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_delete_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
      USING (public.user_can_access_site(site_id));
    $f$, t || '_delete_site_access', t);

    EXECUTE format('GRANT ALL ON public.%I TO authenticated, service_role;', t);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.pm_record_item_snapshot() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pm_seed_life_areas_on_site() TO authenticated, service_role;
