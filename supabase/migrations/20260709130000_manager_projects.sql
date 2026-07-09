-- =============================================================================
-- Fase 1 "Manager dei Manager": fondamenta dati additive.
--
-- Crea il concetto di "progetto" (1:1 con un sito esistente) senza duplicare
-- dati né modificare alcuna tabella in uso dagli spazi online:
--   * manager_projects            — stage kanban + metadati progetto
--   * manager_project_stage_events — storico dei cambi di stage
--   * manager_project_hours       — vista aggregata ore da Timetracking.site_id
--   * is_superadmin()             — helper riusabile per le RLS superadmin-only
--
-- Tutte le entità sono nuove e invisibili a chiunque non sia superadmin.
-- Rollback: DROP delle sole entità create qui (nessuna dipendenza esterna).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper ruolo: stesso pattern validato di pm_is_superadmin(), ma con nome
-- generico riusabile dalle prossime fasi senza accoppiarsi al Personal Manager.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User" u
    WHERE u."authId" = auth.uid()::text
      AND u.role = 'superadmin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Tabella progetti: riferimento 1:1 al sito, soli campi nuovi.
-- Stage = colonne kanban. 'personal' esiste perché l'euristica attuale di
-- /sites/select classifica anche gli spazi personali; la board potrà
-- nasconderla. 'client_demo' corrisponde al vecchio group_key 'custom'
-- ("Utenti da attivare" / demo da presentare a clienti).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manager_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL UNIQUE REFERENCES public.sites(id) ON DELETE CASCADE,
    stage text NOT NULL DEFAULT 'beta'
        CHECK (stage IN ('alpha', 'beta', 'client_demo', 'active', 'personal')),
    board_order integer NOT NULL DEFAULT 0,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    stage_changed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_projects_stage
    ON public.manager_projects (stage, board_order);

CREATE TABLE IF NOT EXISTS public.manager_project_stage_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.manager_projects(id) ON DELETE CASCADE,
    from_stage text,
    to_stage text NOT NULL,
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_project_stage_events_project
    ON public.manager_project_stage_events (project_id, created_at DESC);

-- updated_at automatico (funzione già presente nello schema).
DROP TRIGGER IF EXISTS trg_manager_projects_updated_at ON public.manager_projects;
CREATE TRIGGER trg_manager_projects_updated_at
    BEFORE UPDATE ON public.manager_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Storico stage automatico: ogni INSERT e ogni cambio di stage genera un
-- evento, qualunque sia il client che scrive. Due trigger:
--   * BEFORE UPDATE per aggiornare stage_changed_at (modifica NEW);
--   * AFTER INSERT/UPDATE per registrare l'evento (la riga progetto deve
--     già esistere per la FK). SECURITY DEFINER perché la tabella eventi è
--     essa stessa protetta da RLS.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mp_touch_stage_changed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        NEW.stage_changed_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manager_projects_stage_touch ON public.manager_projects;
CREATE TRIGGER trg_manager_projects_stage_touch
    BEFORE UPDATE ON public.manager_projects
    FOR EACH ROW EXECUTE FUNCTION public.mp_touch_stage_changed_at();

CREATE OR REPLACE FUNCTION public.mp_log_stage_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.manager_project_stage_events (project_id, from_stage, to_stage, changed_by)
        VALUES (NEW.id, NULL, NEW.stage, auth.uid());
    ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
        INSERT INTO public.manager_project_stage_events (project_id, from_stage, to_stage, changed_by)
        VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manager_projects_stage_log ON public.manager_projects;
CREATE TRIGGER trg_manager_projects_stage_log
    AFTER INSERT OR UPDATE ON public.manager_projects
    FOR EACH ROW EXECUTE FUNCTION public.mp_log_stage_change();

-- -----------------------------------------------------------------------------
-- RLS: superadmin-only, nessun altro ruolo vede o tocca queste tabelle.
-- -----------------------------------------------------------------------------
ALTER TABLE public.manager_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_project_stage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manager_projects_superadmin_all ON public.manager_projects;
CREATE POLICY manager_projects_superadmin_all
    ON public.manager_projects
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS manager_project_stage_events_superadmin_read ON public.manager_project_stage_events;
CREATE POLICY manager_project_stage_events_superadmin_read
    ON public.manager_project_stage_events
    FOR SELECT TO authenticated
    USING (public.is_superadmin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_projects TO authenticated;
GRANT SELECT ON public.manager_project_stage_events TO authenticated;
GRANT ALL ON public.manager_projects TO service_role;
GRANT ALL ON public.manager_project_stage_events TO service_role;

-- -----------------------------------------------------------------------------
-- Vista ore per progetto/collaboratore/mese, derivata da Timetracking.site_id
-- (già popolato al 100% in produzione). security_invoker: per i client di
-- sessione la RLS di manager_projects filtra tutto ai non-superadmin (join
-- vuoto); il service client vede tutto come da pattern esistente
-- (lib/collaborator-dashboard.server.ts).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.manager_project_hours
    WITH (security_invoker = true)
    AS
SELECT
    mp.id AS project_id,
    mp.site_id,
    t.employee_id,
    (date_trunc('month', COALESCE(t."startTime", t.created_at)))::date AS month,
    SUM(COALESCE(t.hours, 0) * 60 + COALESCE(t.minutes, 0)) AS total_minutes,
    SUM(t."totalTime") AS total_time,
    COUNT(*) AS entries_count
FROM public.manager_projects mp
JOIN public."Timetracking" t ON t.site_id = mp.site_id
GROUP BY mp.id, mp.site_id, t.employee_id,
    (date_trunc('month', COALESCE(t."startTime", t.created_at)))::date;

GRANT SELECT ON public.manager_project_hours TO authenticated;
GRANT SELECT ON public.manager_project_hours TO service_role;

-- -----------------------------------------------------------------------------
-- Seed: un progetto per ogni sito esistente. Stage derivato in sola lettura:
--   1) override superadmin in user_site_select_preferences (più recente vince,
--      'custom' -> 'client_demo');
--   2) altrimenti replica dell'euristica resolveSiteGroup() di
--      components/sites-select/sites-grid-client.tsx (match substring su
--      subdomain/nome normalizzati, stesso ordine di priorità);
--   3) default 'beta'.
-- Idempotente (ON CONFLICT DO NOTHING): non tocca progetti già esistenti.
-- -----------------------------------------------------------------------------
WITH overrides AS (
    SELECT DISTINCT ON (p.site_id)
        p.site_id,
        CASE p.group_key WHEN 'custom' THEN 'client_demo' ELSE p.group_key END AS stage
    FROM public.user_site_select_preferences p
    JOIN public."User" u
        ON u."authId" = p.user_id::text
        AND u.role = 'superadmin'
    ORDER BY p.site_id, p.updated_at DESC
),
normalized AS (
    SELECT
        s.id,
        s.name,
        trim(BOTH '-' FROM regexp_replace(lower(COALESCE(s.subdomain, '')), '[^a-z0-9]+', '-', 'g')) AS norm_sub,
        trim(BOTH '-' FROM regexp_replace(lower(COALESCE(s.name, '')), '[^a-z0-9]+', '-', 'g')) AS norm_name
    FROM public.sites s
),
heuristic AS (
    SELECT
        n.id,
        n.name,
        CASE
            -- PERSONAL_SPACE_KEYS: personal, paolocci
            WHEN n.norm_sub ~ '(personal|paolocci)' OR n.norm_name ~ '(personal|paolocci)'
                THEN 'personal'
            -- ACTIVE_WORKSPACE_KEYS: matris-pro, santini, mb, estrella
            WHEN n.norm_sub ~ '(matris-pro|santini|mb|estrella)' OR n.norm_name ~ '(matris-pro|santini|mb|estrella)'
                THEN 'active'
            -- CUSTOM_DEMO_KEYS: dadesign, car-detailing, cardetailing, workpassion
            WHEN n.norm_sub ~ '(dadesign|car-detailing|cardetailing|workpassion)' OR n.norm_name ~ '(dadesign|car-detailing|cardetailing|workpassion)'
                THEN 'client_demo'
            -- ALPHA_KEYS: alpha, alfa
            WHEN n.norm_sub ~ '(alpha|alfa)' OR n.norm_name ~ '(alpha|alfa)'
                THEN 'alpha'
            -- BETA_KEYS: beta, template, demo — e default
            ELSE 'beta'
        END AS stage
    FROM normalized n
),
resolved AS (
    SELECT
        h.id AS site_id,
        h.name,
        COALESCE(o.stage, h.stage) AS stage
    FROM heuristic h
    LEFT JOIN overrides o ON o.site_id = h.id
)
INSERT INTO public.manager_projects (site_id, stage, board_order)
SELECT
    r.site_id,
    r.stage,
    ROW_NUMBER() OVER (PARTITION BY r.stage ORDER BY r.name) AS board_order
FROM resolved r
ON CONFLICT (site_id) DO NOTHING;
