-- =====================================================================
-- Manager Personale come capability utente
--
-- Il Manager Personale smette di essere uno "spazio" (site) e diventa
-- una capability attivabile su un utente esistente:
--   - flag `personal_manager_abilitato` su public."User"
--   - aree di vita (Wheel of Life) user-scoped in `aree_vita`
--   - audit dell'abilitazione in `personal_manager_audit`
--   - tabelle pm_* dati re-key user-scoped (site_id deprecato)
--   - data migration dal site personale "matteo-paolocci" + rimozione
--
-- NOTA RLS: il flag NON allarga il perimetro dati. Le policy delle
-- tabelle di spazio (user_can_access_site) restano invariate; la vista
-- personale aggrega passando comunque da quelle policy.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Genere (opzionale, stato neutro selezionabile e persistente)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utente_genere') THEN
    CREATE TYPE utente_genere AS ENUM ('maschio', 'femmina', 'altro', 'non_specificato');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Capability su public."User"
-- ---------------------------------------------------------------------
ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS genere utente_genere NOT NULL DEFAULT 'non_specificato',
  ADD COLUMN IF NOT EXISTS personal_manager_abilitato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personal_manager_abilitato_at timestamptz,
  ADD COLUMN IF NOT EXISTS personal_manager_abilitato_da uuid REFERENCES auth.users(id),
  -- preferenza di landing: sovrascrive il redirect automatico da mobile
  ADD COLUMN IF NOT EXISTS landing_preferita text
    CHECK (landing_preferita IN ('personale', 'ultimo_spazio', 'auto'))
    DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS user_personal_manager_abilitato_idx
  ON public."User" (personal_manager_abilitato)
  WHERE personal_manager_abilitato = true;

-- ---------------------------------------------------------------------
-- 3. Aree di vita (Wheel of Life) — user-scoped, soft delete
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aree_vita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug IN ('career','finance','family','health','fun','friends','growth','spiritual')),
  nome text NOT NULL,              -- Career, Finance, Health, Family...
  colore text NOT NULL,
  punteggio numeric(3,1) CHECK (punteggio BETWEEN 0 AND 10),
  ordine int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (utente_id, slug)
);

CREATE INDEX IF NOT EXISTS aree_vita_utente_id_idx ON public.aree_vita (utente_id);

-- RLS stretta: le aree di vita di una persona non le vede nessun altro,
-- superadmin incluso. Nessuna policy DELETE: solo soft delete via UPDATE.
ALTER TABLE public.aree_vita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aree_vita_select_own ON public.aree_vita;
CREATE POLICY aree_vita_select_own ON public.aree_vita FOR SELECT TO authenticated
  USING (utente_id = auth.uid());

DROP POLICY IF EXISTS aree_vita_insert_own ON public.aree_vita;
CREATE POLICY aree_vita_insert_own ON public.aree_vita FOR INSERT TO authenticated
  WITH CHECK (utente_id = auth.uid());

DROP POLICY IF EXISTS aree_vita_update_own ON public.aree_vita;
CREATE POLICY aree_vita_update_own ON public.aree_vita FOR UPDATE TO authenticated
  USING (utente_id = auth.uid())
  WITH CHECK (utente_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.aree_vita TO authenticated;
GRANT ALL ON public.aree_vita TO service_role;

-- ---------------------------------------------------------------------
-- 4. Audit dell'abilitazione
--    Abilitare la vista aggregata e' un cambio di perimetro dati: tracciato.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_manager_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  azione text NOT NULL CHECK (azione IN ('abilitato', 'disabilitato')),
  eseguito_da uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_manager_audit_utente_idx
  ON public.personal_manager_audit (utente_id);

-- Lettura solo superadmin; scrittura solo dal trigger (SECURITY DEFINER)
-- o dal service role. Nessuna policy INSERT per authenticated.
ALTER TABLE public.personal_manager_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_manager_audit_select_superadmin ON public.personal_manager_audit;
CREATE POLICY personal_manager_audit_select_superadmin
  ON public.personal_manager_audit FOR SELECT TO authenticated
  USING (public.pm_is_superadmin());

GRANT SELECT ON public.personal_manager_audit TO authenticated;
GRANT ALL ON public.personal_manager_audit TO service_role;

-- ---------------------------------------------------------------------
-- 5. Trigger su "User": audit + timestamp al cambio del flag.
--    Nel DB, non nel client. L'attore arriva da set_config('app.actor_id')
--    valorizzato dalla server action; fallback auth.uid(), poi l'utente
--    stesso (es. data migration).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.personal_manager_flag_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NEW.personal_manager_abilitato IS DISTINCT FROM OLD.personal_manager_abilitato THEN
    v_actor := COALESCE(
      NULLIF(current_setting('app.actor_id', true), '')::uuid,
      auth.uid(),
      NEW.auth_id,
      NULLIF(NEW."authId", '')::uuid
    );
    NEW.personal_manager_abilitato_at := now();
    NEW.personal_manager_abilitato_da := v_actor;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.personal_manager_flag_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_utente uuid;
  v_actor uuid;
BEGIN
  IF NEW.personal_manager_abilitato IS DISTINCT FROM OLD.personal_manager_abilitato THEN
    v_utente := COALESCE(NEW.auth_id, NULLIF(NEW."authId", '')::uuid);
    IF v_utente IS NULL THEN
      -- Utente senza link auth: niente audit possibile.
      RETURN NEW;
    END IF;
    v_actor := COALESCE(NEW.personal_manager_abilitato_da, v_utente);
    INSERT INTO public.personal_manager_audit (utente_id, azione, eseguito_da)
    VALUES (
      v_utente,
      CASE WHEN NEW.personal_manager_abilitato THEN 'abilitato' ELSE 'disabilitato' END,
      v_actor
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_personal_manager_flag_before ON public."User";
CREATE TRIGGER user_personal_manager_flag_before
  BEFORE UPDATE OF personal_manager_abilitato ON public."User"
  FOR EACH ROW EXECUTE FUNCTION public.personal_manager_flag_before_update();

DROP TRIGGER IF EXISTS user_personal_manager_flag_after ON public."User";
CREATE TRIGGER user_personal_manager_flag_after
  AFTER UPDATE OF personal_manager_abilitato ON public."User"
  FOR EACH ROW EXECUTE FUNCTION public.personal_manager_flag_after_update();

-- ---------------------------------------------------------------------
-- 6. Re-key user-scoped delle tabelle pm_* dati.
--    site_id diventa nullable (deprecato); le policy passano a
--    user_id = auth.uid(). pm_automations / pm_data_sources acquisiscono
--    user_id. La FK verso sites passa a ON DELETE SET NULL cosi' la
--    rimozione del site personale non cancella i dati della persona.
-- ---------------------------------------------------------------------
ALTER TABLE public.pm_automations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pm_data_sources ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['pm_items', 'pm_item_snapshots', 'pm_automations', 'pm_data_sources'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN site_id DROP NOT NULL;', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', t, t || '_site_id_fkey');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;',
      t, t || '_site_id_fkey'
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS pm_items_user_idx ON public.pm_items (user_id);
CREATE INDEX IF NOT EXISTS pm_automations_user_idx ON public.pm_automations (user_id);
CREATE INDEX IF NOT EXISTS pm_data_sources_user_idx ON public.pm_data_sources (user_id);

-- Lo snapshot degli item non richiede piu' site_id valorizzato.
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

  IF (NEW.status IS DISTINCT FROM OLD.status)
     OR (NEW.priority IS DISTINCT FROM OLD.priority) THEN
    INSERT INTO public.pm_item_snapshots (item_id, site_id, user_id, status, priority)
    VALUES (NEW.id, NEW.site_id, NEW.user_id, NEW.status, NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;

-- Policy user-scoped: il perimetro e' la persona, non lo spazio.
DO $$
DECLARE
  t text;
  p record;
  tbls text[] := ARRAY['pm_items', 'pm_item_snapshots', 'pm_automations', 'pm_data_sources'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Rimuove tutte le policy esistenti (site-scoped) della tabella.
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p.policyname, t);
    END LOOP;

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (user_id = auth.uid());
    $f$, t || '_select_own_user', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
    $f$, t || '_insert_own_user', t);

    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
  END LOOP;
END $$;

-- pm_items: update/delete del proprietario (soft delete via update).
CREATE POLICY pm_items_update_own_user ON public.pm_items FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY pm_items_delete_own_user ON public.pm_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT UPDATE, DELETE ON public.pm_items TO authenticated;

-- pm_automations / pm_data_sources: update del proprietario.
CREATE POLICY pm_automations_update_own_user ON public.pm_automations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT UPDATE ON public.pm_automations TO authenticated;

CREATE POLICY pm_data_sources_update_own_user ON public.pm_data_sources FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT UPDATE ON public.pm_data_sources TO authenticated;

-- Il seed per-site delle life areas e' deprecato: niente piu' aree di vita
-- legate a un sito.
DROP TRIGGER IF EXISTS pm_seed_life_areas_after_site_insert ON public.sites;

-- ---------------------------------------------------------------------
-- 7. Pulizia tassonomia "Personal" dalle strutture di grouping spazi.
-- ---------------------------------------------------------------------
DELETE FROM public.user_site_select_preferences WHERE group_key = 'personal';
ALTER TABLE public.user_site_select_preferences
  DROP CONSTRAINT IF EXISTS user_site_select_preferences_group_key_check;
ALTER TABLE public.user_site_select_preferences
  ADD CONSTRAINT user_site_select_preferences_group_key_check
  CHECK (group_key IN ('active', 'custom', 'beta', 'alpha'));

UPDATE public.manager_projects SET stage = 'active' WHERE stage = 'personal';
ALTER TABLE public.manager_projects
  DROP CONSTRAINT IF EXISTS manager_projects_stage_check;
ALTER TABLE public.manager_projects
  ADD CONSTRAINT manager_projects_stage_check
  CHECK (stage IN ('alpha', 'beta', 'client_demo', 'active'));

-- ---------------------------------------------------------------------
-- 8. Data migration dal site personale "matteo-paolocci":
--    - abilita il flag sugli utenti con beta_app_enabled
--    - copia aree + ultimo punteggio in aree_vita
--    - assegna user_id ad automazioni e data sources
--    - stacca i dati pm_* dal site (site_id -> NULL)
--    - elimina il site personale e l'organizzazione se rimasta vuota
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_site_id uuid;
  v_org_id uuid;
  v_owner uuid;
BEGIN
  SELECT id, organization_id INTO v_site_id, v_org_id
  FROM public.sites
  WHERE subdomain = 'matteo-paolocci';

  IF v_site_id IS NULL THEN
    RAISE NOTICE 'Site personale matteo-paolocci non trovato: skip data migration.';
    RETURN;
  END IF;

  -- Owner: primo utente con accesso beta al site personale.
  SELECT user_id INTO v_owner
  FROM public.pm_access
  WHERE site_id = v_site_id AND beta_app_enabled = true
  ORDER BY created_at
  LIMIT 1;

  -- Flag capability per tutti gli utenti beta-enabled del site personale
  -- (il trigger scrive audit e timestamp).
  UPDATE public."User" u
  SET personal_manager_abilitato = true
  WHERE u.personal_manager_abilitato = false
    AND EXISTS (
      SELECT 1 FROM public.pm_access pa
      WHERE pa.site_id = v_site_id
        AND pa.beta_app_enabled = true
        AND pa.user_id::text = COALESCE(u.auth_id::text, u."authId")
    );

  -- Aree di vita: tassonomia del site + ultimo punteggio per utente.
  INSERT INTO public.aree_vita (utente_id, slug, nome, colore, punteggio, ordine)
  SELECT
    pa.user_id,
    la.slug,
    la.label,
    la.accent_color,
    (
      SELECT s.score::numeric
      FROM public.pm_area_scores s
      WHERE s.site_id = v_site_id
        AND s.user_id = pa.user_id
        AND s.area_slug = la.slug
      ORDER BY s.recorded_at DESC
      LIMIT 1
    ),
    la.sort_order
  FROM public.pm_access pa
  CROSS JOIN public.pm_life_areas la
  WHERE pa.site_id = v_site_id
    AND pa.beta_app_enabled = true
    AND la.site_id = v_site_id
  ON CONFLICT (utente_id, slug) DO NOTHING;

  -- Automazioni e sorgenti dati diventano della persona.
  IF v_owner IS NOT NULL THEN
    UPDATE public.pm_automations SET user_id = v_owner
    WHERE site_id = v_site_id AND user_id IS NULL;
    UPDATE public.pm_data_sources SET user_id = v_owner
    WHERE site_id = v_site_id AND user_id IS NULL;
  END IF;

  -- Stacca i dati personali dal site prima della rimozione.
  UPDATE public.pm_items SET site_id = NULL WHERE site_id = v_site_id;
  UPDATE public.pm_item_snapshots SET site_id = NULL WHERE site_id = v_site_id;
  UPDATE public.pm_automations SET site_id = NULL WHERE site_id = v_site_id;
  UPDATE public.pm_data_sources SET site_id = NULL WHERE site_id = v_site_id;

  -- Dipendenze note del site, poi il site stesso.
  DELETE FROM public.pm_access WHERE site_id = v_site_id;
  DELETE FROM public.pm_area_scores WHERE site_id = v_site_id;
  DELETE FROM public.pm_life_areas WHERE site_id = v_site_id;
  DELETE FROM public.user_sites WHERE site_id = v_site_id;
  DELETE FROM public.site_modules WHERE site_id = v_site_id;
  DELETE FROM public.user_site_select_preferences WHERE site_id = v_site_id;
  DELETE FROM public.manager_projects WHERE site_id = v_site_id;
  DELETE FROM public.site_settings WHERE site_id = v_site_id;
  DELETE FROM public.site_ai_settings WHERE site_id = v_site_id;

  -- Grafo Kanban/Task: alcune FK non hanno ON DELETE CASCADE
  -- (KanbanColumn -> Kanban, Errortracking/Timetracking/etc -> Task,
  --  Client -> sites), quindi vanno eliminate esplicitamente in ordine.
  DELETE FROM public."Errortracking" WHERE site_id = v_site_id;
  DELETE FROM public."Timetracking" WHERE site_id = v_site_id;
  DELETE FROM public."PackingControl" WHERE site_id = v_site_id;
  DELETE FROM public."QualityControl" WHERE site_id = v_site_id;
  DELETE FROM public."Exit_checklist" WHERE site_id = v_site_id;
  DELETE FROM public."Task" WHERE site_id = v_site_id;
  DELETE FROM public."KanbanColumn"
  WHERE "kanbanId" IN (SELECT id FROM public."Kanban" WHERE site_id = v_site_id);
  DELETE FROM public."Kanban" WHERE site_id = v_site_id;
  DELETE FROM public."ClientAddress"
  WHERE "clientId" IN (SELECT id FROM public."Client" WHERE site_id = v_site_id);
  DELETE FROM public."Client" WHERE site_id = v_site_id;

  DELETE FROM public.sites WHERE id = v_site_id;

  -- Organizzazione personale: rimossa se non ha altri siti.
  IF v_org_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sites WHERE organization_id = v_org_id
  ) THEN
    DELETE FROM public.user_organizations WHERE organization_id = v_org_id;
    DELETE FROM public.organizations WHERE id = v_org_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 9. Seed idempotente delle 8 aree standard per un utente.
--    Usato dalla server action all'attivazione della capability.
--    Ripristina eventuali aree soft-deleted invece di duplicarle.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_aree_vita(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.aree_vita (utente_id, slug, nome, colore, ordine)
  VALUES
    (target_user_id, 'career',    'Career',               '#F5921B', 1),
    (target_user_id, 'finance',   'Finance',              '#F2C218', 2),
    (target_user_id, 'family',    'Family',               '#57B947', 3),
    (target_user_id, 'health',    'Health',               '#2FBFA4', 4),
    (target_user_id, 'fun',       'Fun & Recreation',     '#39B7E4', 5),
    (target_user_id, 'friends',   'Friends',              '#6E77D8', 6),
    (target_user_id, 'growth',    'Personal Development', '#B061D4', 7),
    (target_user_id, 'spiritual', 'Spiritual',            '#F0736A', 8)
  ON CONFLICT (utente_id, slug)
  DO UPDATE SET deleted_at = NULL
  WHERE public.aree_vita.deleted_at IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_aree_vita(uuid) TO service_role;
