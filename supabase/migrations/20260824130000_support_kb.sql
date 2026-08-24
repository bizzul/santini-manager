-- =============================================================================
-- Supporto tecnico FDM — knowledge base (Fase 4)
-- Full-text italiano + pg_trgm. Colonna embedding NON creata (innesto futuro).
-- Additive. Rollback: DROP delle sole entità create qui.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_kb_articles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  category_id      uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  title            text NOT NULL,
  body_md          text NOT NULL DEFAULT '',
  tags             text[] NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  source_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  published_at     timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  search_tsv       tsvector NOT NULL DEFAULT ''::tsvector
);

COMMENT ON COLUMN public.support_kb_articles.search_tsv IS
  'Full-text italiano su titolo+tag+corpo, aggiornato da trigger. Innesto futuro semantic search: ADD COLUMN embedding vector(n) dopo CREATE EXTENSION vector.';

CREATE OR REPLACE FUNCTION public.support_kb_articles_tsv()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('italian'::regconfig, coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('italian'::regconfig, coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('italian'::regconfig, coalesce(NEW.body_md, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_kb_articles_tsv ON public.support_kb_articles;
CREATE TRIGGER trg_support_kb_articles_tsv
  BEFORE INSERT OR UPDATE OF title, body_md, tags
  ON public.support_kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.support_kb_articles_tsv();

CREATE INDEX IF NOT EXISTS support_kb_articles_tsv_gin
  ON public.support_kb_articles USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS support_kb_articles_tags_gin
  ON public.support_kb_articles USING GIN (tags);
CREATE INDEX IF NOT EXISTS support_kb_articles_trgm_title
  ON public.support_kb_articles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS support_kb_articles_site_status_idx
  ON public.support_kb_articles (site_id, status);

DROP TRIGGER IF EXISTS trg_support_kb_articles_updated_at ON public.support_kb_articles;
CREATE TRIGGER trg_support_kb_articles_updated_at
  BEFORE UPDATE ON public.support_kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.support_kb_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES public.support_kb_articles(id) ON DELETE CASCADE,
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.support_conversations(id) ON DELETE SET NULL,
  resolved        boolean NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_kb_feedback_once UNIQUE (article_id, user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS support_kb_feedback_article_idx
  ON public.support_kb_feedback (article_id, resolved);

-- -----------------------------------------------------------------------------
-- Search RPC (SECURITY INVOKER → RLS articoli)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_support_kb(
  p_site_id uuid,
  p_query   text,
  p_limit   integer DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  title text,
  body_md text,
  hit_rank real,
  title_sim real
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  tsq tsquery;
  q text := btrim(coalesce(p_query, ''));
  lim integer := GREATEST(1, LEAST(coalesce(p_limit, 3), 10));
BEGIN
  IF q = '' THEN
    RETURN;
  END IF;

  BEGIN
    tsq := websearch_to_tsquery('italian', q);
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('italian', q);
  END;

  IF tsq IS NULL OR tsq = ''::tsquery THEN
    tsq := plainto_tsquery('italian', q);
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.body_md,
    ts_rank(a.search_tsv, tsq) AS hit_rank,
    similarity(a.title, q) AS title_sim
  FROM public.support_kb_articles a
  WHERE a.status = 'published'
    AND (a.site_id IS NULL OR a.site_id = p_site_id)
    AND (
      (tsq IS NOT NULL AND tsq <> ''::tsquery AND a.search_tsv @@ tsq)
      OR similarity(a.title, q) > 0.35
      OR a.title ILIKE '%' || q || '%'
    )
  ORDER BY
    (a.site_id IS NOT NULL) DESC,
    ts_rank(a.search_tsv, tsq) DESC,
    similarity(a.title, q) DESC
  LIMIT lim;
END;
$$;

ALTER FUNCTION public.search_support_kb(uuid, text, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.search_support_kb(uuid, text, integer)
  TO authenticated, service_role;

CREATE OR REPLACE VIEW public.support_kb_article_stats
  WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.site_id,
  a.title,
  a.status,
  a.category_id,
  a.updated_at,
  count(f.*) FILTER (WHERE f.resolved)     AS resolved_yes,
  count(f.*) FILTER (WHERE NOT f.resolved) AS resolved_no,
  count(t.*)                               AS tickets_from_article
FROM public.support_kb_articles a
LEFT JOIN public.support_kb_feedback f ON f.article_id = a.id
LEFT JOIN public.support_tickets t ON a.id = ANY (t.kb_article_ids)
GROUP BY a.id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.support_kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_kb_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_kb_articles_select ON public.support_kb_articles;
CREATE POLICY support_kb_articles_select
  ON public.support_kb_articles FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR (
      status = 'published'
      AND (site_id IS NULL OR public.user_can_access_site(site_id))
    )
    OR (
      site_id IS NOT NULL
      AND public.user_is_site_admin(site_id)
    )
  );

DROP POLICY IF EXISTS support_kb_articles_insert ON public.support_kb_articles;
CREATE POLICY support_kb_articles_insert
  ON public.support_kb_articles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR (site_id IS NOT NULL AND public.user_is_site_admin(site_id))
  );

DROP POLICY IF EXISTS support_kb_articles_update ON public.support_kb_articles;
CREATE POLICY support_kb_articles_update
  ON public.support_kb_articles FOR UPDATE TO authenticated
  USING (
    public.is_superadmin()
    OR (site_id IS NOT NULL AND public.user_is_site_admin(site_id))
  )
  WITH CHECK (
    public.is_superadmin()
    OR (site_id IS NOT NULL AND public.user_is_site_admin(site_id))
  );

DROP POLICY IF EXISTS support_kb_feedback_select ON public.support_kb_feedback;
CREATE POLICY support_kb_feedback_select
  ON public.support_kb_feedback FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_superadmin()
    OR public.user_is_site_admin(site_id)
  );

DROP POLICY IF EXISTS support_kb_feedback_insert ON public.support_kb_feedback;
CREATE POLICY support_kb_feedback_insert
  ON public.support_kb_feedback FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_can_access_site(site_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.support_kb_articles TO authenticated;
GRANT SELECT, INSERT ON public.support_kb_feedback TO authenticated;
GRANT SELECT ON public.support_kb_article_stats TO authenticated;
GRANT ALL ON public.support_kb_articles TO service_role;
GRANT ALL ON public.support_kb_feedback TO service_role;

-- Starter FAQ globali (self-service dimostrabile senza contenuto manuale)
INSERT INTO public.support_kb_articles (
  site_id, category_id, title, body_md, tags, status, published_at
)
SELECT
  NULL,
  c.id,
  v.title,
  v.body_md,
  v.tags,
  'published',
  now()
FROM (
  VALUES
    (
      'accesso',
      'Non riesco ad accedere o ho dimenticato la password',
      $md$
## Accesso a FDM

1. Dalla schermata di login usa **Password dimenticata** e controlla la casella email (anche spam).
2. Se l'account è disattivato, l'amministratore dello Spazio deve riattivarlo da Configurazione → Collaboratori.
3. Un ruolo `user` non vede le voci Listino e Configurazione: è voluto, non un errore.
4. Se il login funziona ma non trovi lo Spazio, verifica di essere stato associato al sito corretto.

Se dopo questi passi il problema resta, apri un ticket dal widget Supporto.
$md$,
      ARRAY['login','password','accesso','permessi']::text[]
    ),
    (
      'kanban',
      'La card Kanban non si sposta o non si salva',
      $md$
## Kanban e task

- Trascina la card solo se hai i permessi sulla board. Senza permesso il drop viene rifiutato.
- Ricarica la pagina se un altro utente ha appena spostato la stessa card (aggiornamento realtime).
- I campi obbligatori (cliente, date) bloccano il salvataggio: controlla i messaggi in rosso nel form.
- Preferenze visuali delle card (compatta/estesa) sono locali al browser: usa **Reset preferenze** nella toolbar Kanban.

Se la card sparisce dopo il drop, segnalalo dal widget indicando board, colonna e codice task.
$md$,
      ARRAY['kanban','card','task','drag']::text[]
    ),
    (
      'altro',
      'Come segnalare un errore o un''anomalia',
      $md$
## Segnalare un problema

1. Apri il widget **Supporto** in basso a destra.
2. Descrivi cosa stavi facendo e cosa è andato storto.
3. Se compare una soluzione dalla knowledge base, indica se ha risolto.
4. In caso contrario conferma l'apertura del ticket: allegano automaticamente Spazio, pagina, browser e gli ultimi errori tecnici.

Non usare il modulo Errori di produzione (Errortracking): quello è per difetti su prodotti/task, non per l'applicazione.
$md$,
      ARRAY['supporto','ticket','errore','segnalazione']::text[]
    )
) AS v(slug, title, body_md, tags)
JOIN public.support_categories c
  ON c.slug = v.slug AND c.site_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_kb_articles a
  WHERE a.site_id IS NULL AND a.title = v.title
);

COMMIT;
