-- Readiness fatturazione (semaforo supplementi su card Fatture OUT).
-- Entita distinte dal listino catalogo `supplementi` / `supplementi_categorie`.
-- Hook: Kanban.is_invoicing_kanban (modulo board), mai site_id hardcoded.
-- Idempotente. RLS nella stessa migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- Flag modulo board Fatturazione (parallelo a is_offer_kanban / is_production_kanban)
-- ---------------------------------------------------------------------------
ALTER TABLE public."Kanban"
  ADD COLUMN IF NOT EXISTS is_invoicing_kanban boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Kanban".is_invoicing_kanban IS
  'Se true, questa kanban e di fatturazione (Fatture OUT): semaforo readiness + supplementi di progetto.';

UPDATE public."Kanban" k
SET is_invoicing_kanban = true
WHERE k.is_invoicing_kanban = false
  AND (
    k.identifier = 'fatture'
    OR EXISTS (
      SELECT 1
      FROM public."KanbanCategory" c
      WHERE c.id = k.category_id
        AND c.identifier = 'fatturazione'
    )
  );

-- ---------------------------------------------------------------------------
-- Helper: admin/superadmin dello spazio (scrittura stato pronto / righe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_site_admin(target_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u.enabled = true
      AND (
        u.auth_id = auth.uid()
        OR u."authId" = (auth.uid())::text
      )
      AND u.role IN ('admin', 'superadmin')
      AND (
        u.role = 'superadmin'
        OR public.user_can_access_site(target_site_id)
      )
  );
$$;

ALTER FUNCTION public.user_is_site_admin(uuid) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- fatturazione_readiness — uno stato per card/progetto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fatturazione_readiness (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  task_id           integer NOT NULL REFERENCES public."Task"(id) ON DELETE CASCADE,
  stato             text NOT NULL DEFAULT 'in_attesa',
  uguale_offerta    boolean NOT NULL DEFAULT false,
  confermato_at     timestamptz,
  confermato_by     uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fatturazione_readiness_stato_check
    CHECK (stato IN ('in_attesa', 'pronto')),
  CONSTRAINT fatturazione_readiness_site_task_unique UNIQUE (site_id, task_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS fatturazione_readiness_task_id_uidx
  ON public.fatturazione_readiness (task_id);

CREATE INDEX IF NOT EXISTS fatturazione_readiness_site_stato_idx
  ON public.fatturazione_readiness (site_id, stato);

DROP TRIGGER IF EXISTS fatturazione_readiness_set_updated_at ON public.fatturazione_readiness;
CREATE TRIGGER fatturazione_readiness_set_updated_at
  BEFORE UPDATE ON public.fatturazione_readiness
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.fatturazione_readiness IS
  'Stato semaforo fatturazione per Task. Verde (pronto) solo dopo conferma esplicita del direttore/admin.';

-- ---------------------------------------------------------------------------
-- fatturazione_supplemento_riga — righe extra sul progetto (non listino)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fatturazione_supplemento_riga (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  task_id       integer NOT NULL REFERENCES public."Task"(id) ON DELETE CASCADE,
  descrizione   text NOT NULL,
  quantita      numeric(12,3) NOT NULL DEFAULT 1,
  prezzo        numeric(12,2) NOT NULL DEFAULT 0,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT fatturazione_supplemento_riga_descrizione_check
    CHECK (char_length(btrim(descrizione)) > 0),
  CONSTRAINT fatturazione_supplemento_riga_quantita_check
    CHECK (quantita > 0)
);

CREATE INDEX IF NOT EXISTS fatturazione_supplemento_riga_task_idx
  ON public.fatturazione_supplemento_riga (task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS fatturazione_supplemento_riga_site_idx
  ON public.fatturazione_supplemento_riga (site_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS fatturazione_supplemento_riga_set_updated_at
  ON public.fatturazione_supplemento_riga;
CREATE TRIGGER fatturazione_supplemento_riga_set_updated_at
  BEFORE UPDATE ON public.fatturazione_supplemento_riga
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.fatturazione_supplemento_riga IS
  'Supplementi di fatturazione legati a un progetto/card (Task), distinti dai supplementi di listino catalogo.';

-- ---------------------------------------------------------------------------
-- Backfill: card gia in To Do sulle board Fatture OUT → arancione (in_attesa)
-- ---------------------------------------------------------------------------
INSERT INTO public.fatturazione_readiness (site_id, task_id, stato)
SELECT t.site_id, t.id, 'in_attesa'
FROM public."Task" t
INNER JOIN public."Kanban" k ON k.id = t."kanbanId"
INNER JOIN public."KanbanColumn" c ON c.id = t."kanbanColumnId"
WHERE t.site_id IS NOT NULL
  AND t.archived = false
  AND k.is_invoicing_kanban = true
  AND (
    c.position = 1
    OR c.identifier ILIKE '%to_do%'
    OR c.identifier ILIKE '%todo%'
    OR c.title ILIKE '%to do%'
    OR c.title ILIKE '%zu erledigen%'
  )
ON CONFLICT (site_id, task_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.fatturazione_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatturazione_supplemento_riga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fatturazione_readiness_select_site_access
  ON public.fatturazione_readiness;
DROP POLICY IF EXISTS fatturazione_readiness_insert_site_access
  ON public.fatturazione_readiness;
DROP POLICY IF EXISTS fatturazione_readiness_update_in_attesa
  ON public.fatturazione_readiness;
DROP POLICY IF EXISTS fatturazione_readiness_update_admin
  ON public.fatturazione_readiness;
DROP POLICY IF EXISTS fatturazione_readiness_delete_admin
  ON public.fatturazione_readiness;

CREATE POLICY fatturazione_readiness_select_site_access
  ON public.fatturazione_readiness
  FOR SELECT TO authenticated
  USING (public.user_can_access_site(site_id));

CREATE POLICY fatturazione_readiness_insert_site_access
  ON public.fatturazione_readiness
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_site(site_id)
    AND stato = 'in_attesa'
  );

-- Membri dello spazio possono riportare/tenere lo stato in_attesa (ingresso in To Do).
CREATE POLICY fatturazione_readiness_update_in_attesa
  ON public.fatturazione_readiness
  FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (
    public.user_can_access_site(site_id)
    AND stato = 'in_attesa'
  );

-- Solo admin/superadmin possono impostare stato pronto.
CREATE POLICY fatturazione_readiness_update_admin
  ON public.fatturazione_readiness
  FOR UPDATE TO authenticated
  USING (public.user_is_site_admin(site_id))
  WITH CHECK (public.user_is_site_admin(site_id));

CREATE POLICY fatturazione_readiness_delete_admin
  ON public.fatturazione_readiness
  FOR DELETE TO authenticated
  USING (public.user_is_site_admin(site_id));

DROP POLICY IF EXISTS fatturazione_supplemento_riga_select_site_access
  ON public.fatturazione_supplemento_riga;
DROP POLICY IF EXISTS fatturazione_supplemento_riga_write_admin
  ON public.fatturazione_supplemento_riga;

CREATE POLICY fatturazione_supplemento_riga_select_site_access
  ON public.fatturazione_supplemento_riga
  FOR SELECT TO authenticated
  USING (public.user_can_access_site(site_id));

CREATE POLICY fatturazione_supplemento_riga_write_admin
  ON public.fatturazione_supplemento_riga
  FOR ALL TO authenticated
  USING (public.user_is_site_admin(site_id))
  WITH CHECK (public.user_is_site_admin(site_id));

GRANT ALL ON TABLE public.fatturazione_readiness TO anon;
GRANT ALL ON TABLE public.fatturazione_readiness TO authenticated;
GRANT ALL ON TABLE public.fatturazione_readiness TO service_role;
GRANT ALL ON TABLE public.fatturazione_supplemento_riga TO anon;
GRANT ALL ON TABLE public.fatturazione_supplemento_riga TO authenticated;
GRANT ALL ON TABLE public.fatturazione_supplemento_riga TO service_role;

COMMIT;

-- Report RLS:
-- fatturazione_readiness          | ON | select all-site; insert in_attesa; update in_attesa | update/delete pronto = admin
-- fatturazione_supplemento_riga   | ON | select all-site; write = admin
