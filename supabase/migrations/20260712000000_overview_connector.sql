-- =============================================================================
-- OVERVIEW CONNECTOR — Dashboard unica dello spazio Matris
--
-- README
-- ------
-- La Overview Connector collega tutte le attivita di Matris pro SA (Azienda e
-- Privato) in un unico sistema Kanban a TRE stati: todo / doing / finish.
--
-- Perche' tre stati (e non quattro): la dashboard digitale ha una manifestazione
-- fisica: tre contenitori nello spazio ufficio/laboratorio, con un display
-- e-paper sopra ciascuno. Le colonne digitali corrispondono 1:1 ai contenitori
-- fisici. Se un giorno servisse una colonna "Attesa" va modellata come
-- sotto_stato di 'doing', mai come quarto stato: il muro ha tre contenitori e
-- deve restare cosi'. Il digitale e' la fonte di verita' unica; il fisico segue.
--
-- Perche' le relazioni sono tabelle di join (e non testo con ';'): ogni
-- attivita tocca simultaneamente piu' progetti, piu' aziende e piu' persone.
-- Non e' un albero, e' un grafo. "Draw Omar" tocca insieme il progetto FDM,
-- l'azienda Swiss Frame e la persona Omar. Modellare queste relazioni come
-- tabelle many-to-many (attivita_progetti / attivita_aziende / attivita_persone)
-- e' cio' che rende la dashboard un CONNECTOR interrogabile invece di un task
-- tracker con stringhe impossibili da mantenere.
--
-- Multi-tenancy: tutte le entita' sono legate a un `site_id` (lo spazio Matris
-- e' il sito con subdomain 'matrispro') e protette da RLS con
-- public.user_can_access_site(site_id), coerente con il resto del manager.
-- L'unica eccezione controllata e' la view v_kanban_counts: espone SOLTANTO
-- numeri (nessun titolo, cliente o persona) ed e' l'unica cosa leggibile dalla
-- anon key dei display ESP32 appesi al muro.
--
-- Rollback: DROP delle sole entita' create qui (nessuna dipendenza esterna
-- oltre a public.sites e agli helper gia' presenti nella baseline).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attivita_spazio') THEN
    CREATE TYPE public.attivita_spazio AS ENUM ('azienda', 'privato');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attivita_stato') THEN
    CREATE TYPE public.attivita_stato AS ENUM ('todo', 'doing', 'finish');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Entita'
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ambiti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,                       -- Admin, Clienti, Progetti
  colore text NOT NULL DEFAULT '#3D3D3D',
  ordine int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  UNIQUE (site_id, nome)
);

CREATE TABLE IF NOT EXISTS public.progetti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,                       -- MMM, FDM, BoosterLab, matris.pro...
  ambito_id uuid REFERENCES public.ambiti(id) ON DELETE SET NULL,
  attivo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  UNIQUE (site_id, nome)
);

CREATE TABLE IF NOT EXISTS public.aziende (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,                       -- Swiss Frame, Falegnameria Santini...
  tipo text,                                -- cliente | fornitore | partner | interna
  deleted_at timestamptz,
  UNIQUE (site_id, nome)
);

CREATE TABLE IF NOT EXISTS public.persone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ruolo text,
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE SET NULL,
  email text,
  deleted_at timestamptz,
  UNIQUE (site_id, nome)
);

-- -----------------------------------------------------------------------------
-- Attivita'
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attivita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  codice text NOT NULL,                     -- A-001, C-004, P-009
  titolo text NOT NULL,
  spazio public.attivita_spazio NOT NULL DEFAULT 'azienda',
  ambito_id uuid NOT NULL REFERENCES public.ambiti(id),
  progetto_id uuid REFERENCES public.progetti(id) ON DELETE SET NULL,  -- progetto PRINCIPALE
  stato public.attivita_stato NOT NULL DEFAULT 'todo',
  sotto_stato text,
  data_stato date NOT NULL DEFAULT current_date,   -- ingresso nello stato ATTUALE
  note text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, codice)
);

-- -----------------------------------------------------------------------------
-- Le tre tabelle di join: il cuore del "connector"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attivita_progetti (
  attivita_id uuid NOT NULL REFERENCES public.attivita(id) ON DELETE CASCADE,
  progetto_id uuid NOT NULL REFERENCES public.progetti(id) ON DELETE CASCADE,
  PRIMARY KEY (attivita_id, progetto_id)
);

CREATE TABLE IF NOT EXISTS public.attivita_aziende (
  attivita_id uuid NOT NULL REFERENCES public.attivita(id) ON DELETE CASCADE,
  azienda_id  uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  PRIMARY KEY (attivita_id, azienda_id)
);

CREATE TABLE IF NOT EXISTS public.attivita_persone (
  attivita_id uuid NOT NULL REFERENCES public.attivita(id) ON DELETE CASCADE,
  persona_id  uuid NOT NULL REFERENCES public.persone(id) ON DELETE CASCADE,
  ruolo text,                               -- owner | collaboratore | referente
  PRIMARY KEY (attivita_id, persona_id)
);

-- -----------------------------------------------------------------------------
-- Storico transizioni: alimenta lead time e stagnazione
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attivita_transizioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attivita_id uuid NOT NULL REFERENCES public.attivita(id) ON DELETE CASCADE,
  stato_da public.attivita_stato,
  stato_a public.attivita_stato NOT NULL,
  giorni_nello_stato_precedente int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wip_limits (
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  stato public.attivita_stato NOT NULL,
  limite int NOT NULL,
  soglia_stagnazione_giorni int NOT NULL DEFAULT 14,
  PRIMARY KEY (site_id, stato)
);

CREATE INDEX IF NOT EXISTS attivita_stato_idx
  ON public.attivita (stato) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS attivita_ambito_stato_idx
  ON public.attivita (ambito_id, stato) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS attivita_site_idx
  ON public.attivita (site_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS attivita_aziende_azienda_idx
  ON public.attivita_aziende (azienda_id);
CREATE INDEX IF NOT EXISTS attivita_persone_persona_idx
  ON public.attivita_persone (persona_id);
CREATE INDEX IF NOT EXISTS attivita_progetti_progetto_idx
  ON public.attivita_progetti (progetto_id);

-- -----------------------------------------------------------------------------
-- Trigger OBBLIGATORIO: la logica di stato vive nel DB, non nel client.
-- Quando `stato` cambia -> resetta data_stato = current_date e registra una
-- riga in attivita_transizioni coi giorni passati nello stato precedente.
-- Deve stare qui: qualunque fonte scriva (SQL editor, altro device, script)
-- lo storico resta coerente. `updated_at` si aggiorna sempre.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attivita_on_stato_change() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stato IS DISTINCT FROM OLD.stato THEN
    INSERT INTO public.attivita_transizioni
      (attivita_id, stato_da, stato_a, giorni_nello_stato_precedente)
    VALUES
      (NEW.id, OLD.stato, NEW.stato, (current_date - OLD.data_stato));
    NEW.data_stato := current_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attivita_stato_change ON public.attivita;
CREATE TRIGGER trg_attivita_stato_change
  BEFORE UPDATE ON public.attivita
  FOR EACH ROW EXECUTE FUNCTION public.attivita_on_stato_change();

-- -----------------------------------------------------------------------------
-- RLS — abilitata nella STESSA migration del CREATE TABLE (regola Matris).
-- Policy {tabella}_{operazione}_site_access via user_can_access_site(site_id).
-- Le tre join table non hanno site_id: ereditano l'accesso dalla attivita padre.
-- -----------------------------------------------------------------------------
ALTER TABLE public.ambiti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aziende ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persone ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita_transizioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita_progetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita_aziende ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attivita_persone ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip_limits ENABLE ROW LEVEL SECURITY;

-- Entita' site-scoped: una policy FOR ALL per tabella.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ambiti','progetti','aziende','persone','attivita','wip_limits']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_all_site_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (public.user_can_access_site(site_id)) '
      || 'WITH CHECK (public.user_can_access_site(site_id))',
      tbl || '_all_site_access', tbl
    );
  END LOOP;
END $$;

-- attivita_transizioni: accesso derivato dalla attivita padre.
DROP POLICY IF EXISTS attivita_transizioni_all_site_access ON public.attivita_transizioni;
CREATE POLICY attivita_transizioni_all_site_access
  ON public.attivita_transizioni FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.attivita a
    WHERE a.id = attivita_transizioni.attivita_id
      AND public.user_can_access_site(a.site_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.attivita a
    WHERE a.id = attivita_transizioni.attivita_id
      AND public.user_can_access_site(a.site_id)
  ));

-- Join tables: accesso derivato dalla attivita padre.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['attivita_progetti','attivita_aziende','attivita_persone']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_all_site_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (EXISTS (SELECT 1 FROM public.attivita a WHERE a.id = %I.attivita_id AND public.user_can_access_site(a.site_id))) '
      || 'WITH CHECK (EXISTS (SELECT 1 FROM public.attivita a WHERE a.id = %I.attivita_id AND public.user_can_access_site(a.site_id)))',
      tbl || '_all_site_access', tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- Grants: authenticated opera sotto RLS, service_role bypassa.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.ambiti, public.progetti, public.aziende, public.persone,
  public.attivita, public.attivita_transizioni, public.attivita_progetti,
  public.attivita_aziende, public.attivita_persone, public.wip_limits
  TO authenticated;
GRANT ALL ON
  public.ambiti, public.progetti, public.aziende, public.persone,
  public.attivita, public.attivita_transizioni, public.attivita_progetti,
  public.attivita_aziende, public.attivita_persone, public.wip_limits
  TO service_role;

-- -----------------------------------------------------------------------------
-- View per i display fisici (ESP32): SOLO numeri, un semaforo per stato.
-- SECURITY DEFINER (default): gira come owner e aggrega i conteggi senza
-- esporre alcun titolo/cliente/persona. Raggruppata per site_id: il device
-- filtra `?site_id=eq.<matris>`. E' la sola forma sicura di dato a muro.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_kanban_counts AS
SELECT
  a.site_id,
  a.stato,
  count(*)                          AS card_dentro,
  w.limite                          AS wip_limite,
  max(current_date - a.data_stato)  AS giorni_fermo_max,
  CASE
    WHEN count(*) > w.limite        THEN 'rosso'
    WHEN count(*) >= w.limite * 0.8 THEN 'giallo'
    ELSE 'verde'
  END                               AS semaforo
FROM public.attivita a
JOIN public.wip_limits w ON w.stato = a.stato AND w.site_id = a.site_id
WHERE a.deleted_at IS NULL
GROUP BY a.site_id, a.stato, w.limite;

GRANT SELECT ON public.v_kanban_counts TO anon;
GRANT SELECT ON public.v_kanban_counts TO authenticated;
GRANT SELECT ON public.v_kanban_counts TO service_role;

-- -----------------------------------------------------------------------------
-- View di carico (pannelli 5 e 6): rispettano la RLS del chiamante
-- (security_invoker), niente join ricostruiti nel client.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_carico_aziende
  WITH (security_invoker = true) AS
SELECT az.id, az.site_id, az.nome,
  count(*) FILTER (WHERE a.stato = 'todo')                 AS todo,
  count(*) FILTER (WHERE a.stato = 'doing')                AS doing,
  count(*) FILTER (WHERE a.stato IN ('todo','doing'))      AS attive
FROM public.aziende az
LEFT JOIN public.attivita_aziende aa ON aa.azienda_id = az.id
LEFT JOIN public.attivita a ON a.id = aa.attivita_id AND a.deleted_at IS NULL
WHERE az.deleted_at IS NULL
GROUP BY az.id, az.site_id, az.nome;

CREATE OR REPLACE VIEW public.v_carico_persone
  WITH (security_invoker = true) AS
SELECT pe.id, pe.site_id, pe.nome,
  count(*) FILTER (WHERE a.stato = 'todo')                 AS todo,
  count(*) FILTER (WHERE a.stato = 'doing')                AS doing,
  count(*) FILTER (WHERE a.stato IN ('todo','doing'))      AS attive
FROM public.persone pe
LEFT JOIN public.attivita_persone ap ON ap.persona_id = pe.id
LEFT JOIN public.attivita a ON a.id = ap.attivita_id AND a.deleted_at IS NULL
WHERE pe.deleted_at IS NULL
GROUP BY pe.id, pe.site_id, pe.nome;

GRANT SELECT ON public.v_carico_aziende, public.v_carico_persone TO authenticated;
GRANT SELECT ON public.v_carico_aziende, public.v_carico_persone TO service_role;

-- -----------------------------------------------------------------------------
-- View board: righe attivita + giorni_fermo calcolato in SQL (mai nel client)
-- + relazioni aggregate in json. Una sola query alimenta board/KPI/matrice.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_attivita_board
  WITH (security_invoker = true) AS
SELECT
  a.id,
  a.site_id,
  a.codice,
  a.titolo,
  a.spazio,
  a.stato,
  a.sotto_stato,
  a.data_stato,
  a.note,
  a.ambito_id,
  am.nome   AS ambito_nome,
  am.colore AS ambito_colore,
  a.progetto_id,
  (current_date - a.data_stato) AS giorni_fermo,
  COALESCE((
    SELECT json_agg(pr.nome ORDER BY pr.nome)
    FROM public.attivita_progetti ap
    JOIN public.progetti pr ON pr.id = ap.progetto_id
    WHERE ap.attivita_id = a.id
  ), '[]'::json) AS progetti,
  COALESCE((
    SELECT json_agg(az.nome ORDER BY az.nome)
    FROM public.attivita_aziende aa
    JOIN public.aziende az ON az.id = aa.azienda_id
    WHERE aa.attivita_id = a.id
  ), '[]'::json) AS aziende,
  COALESCE((
    SELECT json_agg(pe.nome ORDER BY pe.nome)
    FROM public.attivita_persone apn
    JOIN public.persone pe ON pe.id = apn.persona_id
    WHERE apn.attivita_id = a.id
  ), '[]'::json) AS persone
FROM public.attivita a
JOIN public.ambiti am ON am.id = a.ambito_id
WHERE a.deleted_at IS NULL;

GRANT SELECT ON public.v_attivita_board TO authenticated;
GRANT SELECT ON public.v_attivita_board TO service_role;

-- =============================================================================
-- SEED — 31 attivita reali dello spazio Matris (subdomain 'matrispro').
-- Idempotente: ON CONFLICT DO NOTHING ovunque. `data_stato` retrodatata a
-- ritroso da oggi. `doing` parte a 9 contro un limite di 8: il semaforo DEVE
-- accendersi rosso al primo caricamento (verifica che il vincolo WIP sia reale).
-- =============================================================================

-- Ambiti
INSERT INTO public.ambiti (site_id, nome, colore, ordine)
SELECT s.id, v.nome, v.colore, v.ordine
FROM (SELECT id FROM public.sites WHERE subdomain = 'matrispro') s
CROSS JOIN (VALUES
  ('Admin',    '#6B7280', 0),
  ('Clienti',  '#2563EB', 1),
  ('Progetti', '#7C3AED', 2)
) AS v(nome, colore, ordine)
ON CONFLICT (site_id, nome) DO NOTHING;

-- Progetti
INSERT INTO public.progetti (site_id, nome)
SELECT s.id, v.nome
FROM (SELECT id FROM public.sites WHERE subdomain = 'matrispro') s
CROSS JOIN (VALUES
  ('MMM'), ('FDM'), ('BoosterLab'), ('matris.pro'), ('Personal Manager'),
  ('Swiss Frame'), ('Santini'), ('Formateria'), ('Leventina'), ('GSH Locarno')
) AS v(nome)
ON CONFLICT (site_id, nome) DO NOTHING;

-- Aziende
INSERT INTO public.aziende (site_id, nome, tipo)
SELECT s.id, v.nome, v.tipo
FROM (SELECT id FROM public.sites WHERE subdomain = 'matrispro') s
CROSS JOIN (VALUES
  ('Matris pro SA',         'interna'),
  ('Swiss Frame',           'cliente'),
  ('Falegnameria Santini',  'cliente'),
  ('Baccialegno',           'cliente'),
  ('Formateria',            'cliente'),
  ('Grand Hotel Locarno',   'cliente'),
  ('Comune di Bellinzona',  'partner')
) AS v(nome, tipo)
ON CONFLICT (site_id, nome) DO NOTHING;

-- Persone (azienda_id risolta per nome, dove presente)
INSERT INTO public.persone (site_id, nome, azienda_id)
SELECT s.id, v.nome,
  (SELECT id FROM public.aziende WHERE site_id = s.id AND nome = v.azienda)
FROM (SELECT id FROM public.sites WHERE subdomain = 'matrispro') s
CROSS JOIN (VALUES
  ('Matteo Paolocci', NULL),
  ('Guido Trinci',    NULL),
  ('Fabio Kappeli',   NULL),
  ('Omar',            'Swiss Frame'),
  ('Frank Schurman',  'Swiss Frame'),
  ('Zuard Atanaszov', 'Formateria'),
  ('Yan',             NULL),
  ('Jimi',            NULL)
) AS v(nome, azienda)
ON CONFLICT (site_id, nome) DO NOTHING;

-- WIP limits: todo 20, doing 8, finish 30. Soglia stagnazione 14 giorni.
INSERT INTO public.wip_limits (site_id, stato, limite, soglia_stagnazione_giorni)
SELECT s.id, v.stato::public.attivita_stato, v.limite, 14
FROM (SELECT id FROM public.sites WHERE subdomain = 'matrispro') s
CROSS JOIN (VALUES
  ('todo', 20), ('doing', 8), ('finish', 30)
) AS v(stato, limite)
ON CONFLICT (site_id, stato) DO NOTHING;

-- Attivita (ambito e progetto principale risolti per nome; data_stato a ritroso)
INSERT INTO public.attivita
  (site_id, codice, titolo, spazio, ambito_id, progetto_id, stato, sotto_stato, data_stato)
SELECT
  s.id, v.codice, v.titolo, 'azienda'::public.attivita_spazio,
  (SELECT id FROM public.ambiti   WHERE site_id = s.id AND nome = v.ambito),
  (SELECT id FROM public.progetti WHERE site_id = s.id AND nome = v.progetto),
  v.stato::public.attivita_stato,
  v.sotto_stato,
  current_date - v.giorni
FROM (SELECT id FROM public.sites WHERE subdomain = 'matrispro') s
CROSS JOIN (VALUES
  ('A-001', 'Contabilita Q2/2026',          'Admin',    NULL,               'todo',   NULL,        11),
  ('A-002', 'Corporate ID',                 'Admin',    NULL,               'todo',   NULL,        11),
  ('A-003', 'Tax 2025',                     'Admin',    NULL,               'todo',   NULL,        11),
  ('A-004', 'Sito matris.pro',              'Admin',    'matris.pro',       'doing',  'Redazione', 17),
  ('A-005', 'Processi Matris',              'Admin',    NULL,               'doing',  'Redazione', 17),
  ('A-006', 'Manager Matris',               'Admin',    'Personal Manager', 'doing',  'Test',      17),
  ('A-007', 'Inventario',                   'Admin',    NULL,               'finish', NULL,        32),
  ('A-008', 'Custom gadget',                'Admin',    NULL,               'finish', NULL,        32),
  ('A-009', 'Beta sito',                    'Admin',    'matris.pro',       'finish', NULL,        32),
  ('C-001', 'AB Formateria',                'Clienti',  'Formateria',       'todo',   NULL,        11),
  ('C-002', 'Plan Santini',                 'Clienti',  'Santini',          'todo',   NULL,        11),
  ('C-003', 'RE Omar',                      'Clienti',  'Swiss Frame',      'todo',   NULL,        11),
  ('C-004', 'Draw Omar',                    'Clienti',  'Swiss Frame',      'todo',   NULL,        11),
  ('C-005', 'Doc Omar',                     'Clienti',  'Swiss Frame',      'todo',   NULL,        11),
  ('C-006', 'Brief Formateria',             'Clienti',  'Formateria',       'doing',  'Revisione', 14),
  ('C-007', 'Bilancio parziale Santini',    'Clienti',  'Santini',          'doing',  'Redazione', 14),
  ('C-008', 'Istruzioni Manager Santini',   'Clienti',  'Santini',          'doing',  'Redazione', 14),
  ('C-009', 'Inventario',                   'Clienti',  NULL,               'finish', NULL,        32),
  ('C-010', 'Custom gadget',                'Clienti',  NULL,               'finish', NULL,        32),
  ('C-011', 'Beta sito',                    'Clienti',  NULL,               'finish', NULL,        32),
  ('P-001', 'Mail Leventina',               'Progetti', 'Leventina',        'todo',   NULL,        11),
  ('P-002', 'Mail xxx',                     'Progetti', NULL,               'todo',   NULL,        11),
  ('P-003', 'Mail xxx',                     'Progetti', NULL,               'todo',   NULL,        11),
  ('P-004', 'Mail XXX',                     'Progetti', NULL,               'todo',   NULL,        11),
  ('P-005', 'Materiale',                    'Progetti', NULL,               'todo',   NULL,        11),
  ('P-006', 'Broschure MMM',                'Progetti', 'MMM',              'doing',  'Redazione', 22),
  ('P-007', 'Video MMM',                    'Progetti', 'MMM',              'doing',  'Redazione', 22),
  ('P-008', 'Beta MMM',                     'Progetti', 'MMM',              'doing',  'Test',      27),
  ('P-009', 'Inventario',                   'Progetti', NULL,               'finish', NULL,        32),
  ('P-010', 'Custom gadget',                'Progetti', NULL,               'finish', NULL,        32),
  ('P-011', 'Beta sito',                    'Progetti', NULL,               'finish', NULL,        32)
) AS v(codice, titolo, ambito, progetto, stato, sotto_stato, giorni)
ON CONFLICT (site_id, codice) DO NOTHING;

-- attivita_progetti — progetto principale (dalla colonna progetto_id)
INSERT INTO public.attivita_progetti (attivita_id, progetto_id)
SELECT a.id, a.progetto_id
FROM public.attivita a
JOIN public.sites s ON s.id = a.site_id AND s.subdomain = 'matrispro'
WHERE a.progetto_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- attivita_progetti — progetti correlati (grafo)
INSERT INTO public.attivita_progetti (attivita_id, progetto_id)
SELECT a.id, p.id
FROM (VALUES
  ('A-002', 'matris.pro'),
  ('A-004', 'Personal Manager'), ('A-004', 'FDM'),
  ('A-005', 'Personal Manager'),
  ('A-006', 'FDM'), ('A-006', 'MMM'),
  ('A-009', 'matris.pro'),
  ('C-002', 'FDM'),
  ('C-003', 'FDM'),
  ('C-004', 'FDM'),
  ('C-005', 'FDM'),
  ('C-008', 'FDM'),
  ('C-011', 'matris.pro'),
  ('P-005', 'GSH Locarno'),
  ('P-006', 'MMM'),
  ('P-007', 'MMM'),
  ('P-008', 'MMM'),
  ('P-011', 'matris.pro')
) AS v(codice, progetto)
JOIN public.sites s ON s.subdomain = 'matrispro'
JOIN public.attivita a ON a.site_id = s.id AND a.codice = v.codice
JOIN public.progetti p ON p.site_id = s.id AND p.nome = v.progetto
ON CONFLICT DO NOTHING;

-- attivita_aziende
INSERT INTO public.attivita_aziende (attivita_id, azienda_id)
SELECT a.id, az.id
FROM (VALUES
  ('A-001', 'Matris pro SA'), ('A-002', 'Matris pro SA'), ('A-003', 'Matris pro SA'),
  ('A-004', 'Matris pro SA'), ('A-005', 'Matris pro SA'), ('A-006', 'Matris pro SA'),
  ('A-007', 'Matris pro SA'), ('A-008', 'Matris pro SA'), ('A-009', 'Matris pro SA'),
  ('C-001', 'Formateria'),
  ('C-002', 'Falegnameria Santini'),
  ('C-003', 'Swiss Frame'), ('C-004', 'Swiss Frame'), ('C-005', 'Swiss Frame'),
  ('C-006', 'Formateria'),
  ('C-007', 'Falegnameria Santini'), ('C-008', 'Falegnameria Santini'),
  ('P-001', 'Matris pro SA'),
  ('P-005', 'Grand Hotel Locarno'),
  ('P-006', 'Matris pro SA'), ('P-007', 'Matris pro SA'), ('P-008', 'Matris pro SA'),
  ('P-009', 'Matris pro SA'), ('P-010', 'Matris pro SA'), ('P-011', 'Matris pro SA')
) AS v(codice, azienda)
JOIN public.sites s ON s.subdomain = 'matrispro'
JOIN public.attivita a ON a.site_id = s.id AND a.codice = v.codice
JOIN public.aziende az ON az.site_id = s.id AND az.nome = v.azienda
ON CONFLICT DO NOTHING;

-- attivita_persone
INSERT INTO public.attivita_persone (attivita_id, persona_id)
SELECT a.id, pe.id
FROM (VALUES
  ('A-001', 'Matteo Paolocci'), ('A-002', 'Matteo Paolocci'), ('A-003', 'Matteo Paolocci'),
  ('A-004', 'Matteo Paolocci'), ('A-005', 'Matteo Paolocci'), ('A-006', 'Matteo Paolocci'),
  ('A-007', 'Matteo Paolocci'), ('A-008', 'Matteo Paolocci'), ('A-009', 'Matteo Paolocci'),
  ('C-001', 'Zuard Atanaszov'),
  ('C-002', 'Matteo Paolocci'),
  ('C-003', 'Omar'), ('C-003', 'Frank Schurman'),
  ('C-004', 'Omar'),
  ('C-005', 'Omar'),
  ('C-006', 'Zuard Atanaszov'),
  ('C-007', 'Matteo Paolocci'), ('C-008', 'Matteo Paolocci'),
  ('C-009', 'Matteo Paolocci'), ('C-010', 'Matteo Paolocci'), ('C-011', 'Matteo Paolocci'),
  ('P-001', 'Matteo Paolocci'),
  ('P-005', 'Matteo Paolocci'),
  ('P-006', 'Matteo Paolocci'), ('P-006', 'Guido Trinci'),
  ('P-007', 'Matteo Paolocci'),
  ('P-008', 'Matteo Paolocci'), ('P-008', 'Guido Trinci'),
  ('P-009', 'Matteo Paolocci'), ('P-010', 'Matteo Paolocci'), ('P-011', 'Matteo Paolocci')
) AS v(codice, persona)
JOIN public.sites s ON s.subdomain = 'matrispro'
JOIN public.attivita a ON a.site_id = s.id AND a.codice = v.codice
JOIN public.persone pe ON pe.site_id = s.id AND pe.nome = v.persona
ON CONFLICT DO NOTHING;
