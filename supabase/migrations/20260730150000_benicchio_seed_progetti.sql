-- Migration: 25 progetti demo Benicchio SA (Task) — 5 per Kanban, colonna To Do
-- Progetto: jzxffusiwtrvjwmpjztu (Full Data Manager)
-- Prerequisiti: site, clienti (20260730130000), fornitori (20260730140000)
--
-- Colonne Kanban: identifier con prefisso site (20260730100000_site_benicchio.sql):
--   benicchio_to_do_0_offerte, benicchio_to_do_1_progettazione, ecc.
--
-- NOTA SICUREZZA: Task ha RLS disattivata. Codici DEMO-* per rimozione bulk.
-- luogo = indirizzo completo per geocoding mappa Dashboard Overview.

BEGIN;

DO $$
DECLARE
  v_site_id   uuid;
  v_kanban_id integer;
  v_col_id    integer;
  v_rows      integer;
BEGIN
  SELECT id INTO v_site_id
  FROM public.sites
  WHERE subdomain = 'benicchio';

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site benicchio non trovato';
  END IF;

  -- Helper: risolve clientId per businessName o individualLastName, fallback primo cliente site
  -- (implementato inline con COALESCE nelle INSERT)

  ---------------------------------------------------------------------------
  -- Offerte (0_offerte) — 5 progetti
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id
    AND k.identifier = '0_offerte'
    AND c.identifier = 'benicchio_to_do_0_offerte';

  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna To Do non risolta: 0_offerte / benicchio_to_do_0_offerte';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, "deliveryDate", termine_produzione
  )
  SELECT
    v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl
       WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key)
       LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo,
    v.prezzo, v.pezzi, v.codice,
    (CURRENT_DATE + v.giorni)::timestamp,
    CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Nuovo giardino residenziale con prato e siepe',
     'Via ai Grotti 18, 6963 Pregassona', 18500::float8, 1::numeric, 'DEMO-OFF-01', 'Rossi', 45::integer),
    ('Preventivo impianto di irrigazione automatico',
     'Via Lugano 44, 6962 Viganello', 8200::float8, NULL::numeric, 'DEMO-OFF-02', 'Fontana', 30::integer),
    ('Riqualifica aiuole condominiali',
     'Via Nassa 20, 6900 Lugano', 12400::float8, NULL::numeric, 'DEMO-OFF-03', 'Gestioni Immobiliari Ceresio Sagl', 60::integer),
    ('Fornitura e posa prato in rotoli',
     'Via Vincenzo Vela 8, 6900 Paradiso', 6800::float8, 320::numeric, 'DEMO-OFF-04', 'Patrimoni & Stabili SA', 40::integer),
    ('Progetto terrazza verde con fioriere',
     'Via Brere 6, 6598 Tenero', 5600::float8, NULL::numeric, 'DEMO-OFF-05', 'Müller', 35::integer)
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t
    WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Progettazione (1_progettazione) — 5 progetti
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id
    AND k.identifier = '1_progettazione'
    AND c.identifier = 'benicchio_to_do_1_progettazione';

  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna To Do non risolta: 1_progettazione';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, "deliveryDate", termine_produzione
  )
  SELECT
    v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl
       WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key)
       LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo,
    v.prezzo, v.pezzi, v.codice,
    (CURRENT_DATE + v.giorni)::timestamp,
    CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Piano di piantumazione villa privata',
     'Via Cantonale 112, 6646 Gordola', 4200::float8, NULL::numeric, 'DEMO-PRG-01', 'Bernasconi', 50::integer),
    ('Progetto giardino roccioso',
     'Via Collina d''Oro 14, 6926 Montagnola', 5800::float8, NULL::numeric, 'DEMO-PRG-02', 'Immobiliare Collina d''Oro SA', 55::integer),
    ('Studio illuminazione e percorsi giardino',
     'Via Collina 3, 6938 Cademario', 3500::float8, NULL::numeric, 'DEMO-PRG-03', 'Pedrazzini', 42::integer),
    ('Progetto verde pensile',
     'Via Cantonale 98, 6900 Massagno', 7200::float8, NULL::numeric, 'DEMO-PRG-04', 'Amministrazione Stabili Luganese SA', 65::integer),
    ('Rilievo e progetto rinaturazione sponda',
     'Via Ramogna 12, 6600 Locarno', 15000::float8, NULL::numeric, 'DEMO-PRG-05', 'Città di Locarno', 70::integer)
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t
    WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Costruzione (2_costruzione) — 5 progetti
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id
    AND k.identifier = '2_costruzione'
    AND c.identifier = 'benicchio_to_do_2_costruzione';

  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna To Do non risolta: 2_costruzione';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, "deliveryDate", termine_produzione
  )
  SELECT
    v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl
       WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key)
       LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo,
    v.prezzo, v.pezzi, v.codice,
    (CURRENT_DATE + v.giorni)::timestamp,
    CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Realizzazione muretto a secco e pavimentazione',
     'Via Carona 21, 6942 Sorengo', 28000::float8, 45::numeric, 'DEMO-CST-01', 'Keller', 75::integer),
    ('Costruzione impianto di irrigazione interrato',
     'Via Luigi Cagliero 5, 6850 Mendrisio', 18500::float8, NULL::numeric, 'DEMO-CST-02', 'Fiduciaria Immobiliare Momò SA', 90::integer),
    ('Movimento terra e nuovo prato',
     'Via Bosco 9, 6932 Breganzona', 14200::float8, 280::numeric, 'DEMO-CST-03', 'Neri', 80::integer),
    ('Posa siepe di lauroceraso e messa a dimora alberi',
     'Via Riva 27, 6949 Savosa', 9600::float8, 85::numeric, 'DEMO-CST-04', 'Martin', 85::integer),
    ('Costruzione pergolato e area relax',
     'Via al Mulino 5, 6944 Comano', 22000::float8, NULL::numeric, 'DEMO-CST-05', 'Galli', 95::integer)
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t
    WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Manutenzione (3_manutenzione) — 5 progetti
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id
    AND k.identifier = '3_manutenzione'
    AND c.identifier = 'benicchio_to_do_3_manutenzione';

  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna To Do non risolta: 3_manutenzione';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, "deliveryDate", termine_produzione
  )
  SELECT
    v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl
       WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key)
       LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo,
    v.prezzo, v.pezzi, v.codice,
    (CURRENT_DATE + v.giorni)::timestamp,
    CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Manutenzione stagionale parco pubblico',
     'Via Canova 14, 6900 Lugano', 18000::float8, NULL::numeric, 'DEMO-MAN-01', 'Città di Lugano', 30::integer),
    ('Sfalcio e potatura area condominiale',
     'Via Stazione 22, 6710 Biasca', 4500::float8, NULL::numeric, 'DEMO-MAN-02', 'Gestione Condomini Riviera Sagl', 25::integer),
    ('Contratto manutenzione verde comunale',
     'Via Borgo 4, 6612 Ascona', 24000::float8, NULL::numeric, 'DEMO-MAN-03', 'Comune di Ascona', 60::integer),
    ('Potatura alberi ad alto fusto',
     'Via al Chioso 5, 6950 Tesserete', 6800::float8, 12::numeric, 'DEMO-MAN-04', 'Comune di Capriasca', 35::integer),
    ('Trattamento fitosanitario e concimazione',
     'Via Orico 28, 6500 Bellinzona', 3200::float8, NULL::numeric, 'DEMO-MAN-05', 'Città di Bellinzona', 20::integer)
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t
    WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Fatture OUT (fatture) — 5 progetti
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id
    AND k.identifier = 'fatture'
    AND c.identifier = 'benicchio_to_do_fatture';

  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna To Do non risolta: fatture';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, "deliveryDate", termine_produzione
  )
  SELECT
    v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl
       WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key)
       LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo,
    v.prezzo, v.pezzi, v.codice,
    (CURRENT_DATE + v.giorni)::timestamp,
    CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Fattura realizzazione giardino privato',
     'Via Boscareccia 11, 6949 Canobbio', 28500::float8, NULL::numeric, 'DEMO-FAT-01', 'Vogel', 15::integer),
    ('Fattura manutenzione trimestrale',
     'Via San Gottardo 62, 6616 Losone', 4200::float8, NULL::numeric, 'DEMO-FAT-02', 'Comune di Losone', 10::integer),
    ('Fattura impianto irrigazione',
     'Via Lugano 15, 6987 Caslano', 19200::float8, NULL::numeric, 'DEMO-FAT-03', 'Regie del Malcantone Sagl', 20::integer),
    ('Fattura fornitura piante',
     'Via Ramogna 12, 6600 Locarno', 7400::float8, NULL::numeric, 'DEMO-FAT-04', 'Amministrazioni Verbano SA', 25::integer),
    ('Fattura potatura straordinaria',
     'Via Orico 28, 6500 Bellinzona', 5100::float8, NULL::numeric, 'DEMO-FAT-05', 'Studio Immobiliare Piano SA', 18::integer)
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t
    WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  -- Verifica post-insert: devono esserci esattamente 25 task DEMO-* sul site
  SELECT COUNT(*) INTO v_rows
  FROM public."Task" t
  WHERE t.site_id = v_site_id
    AND t.unique_code LIKE 'DEMO-%';

  IF v_rows <> 25 THEN
    RAISE EXCEPTION 'Attesi 25 task DEMO-* su Benicchio, trovati %', v_rows;
  END IF;

END $$;

COMMIT;

-- =============================================================================
-- 7. Verifiche di accettazione
-- =============================================================================

-- 1) Totale task demo = 25
SELECT COUNT(*) AS demo_tasks
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%';
-- ATTESO: demo_tasks = 25

-- 2) 5 task per Kanban, tutti in To Do
SELECT k.identifier, k.title, COUNT(*) AS task_count,
       COUNT(DISTINCT t."kanbanColumnId") AS distinct_columns
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
JOIN public."Kanban" k ON k.id = t."kanbanId"
WHERE t.unique_code LIKE 'DEMO-%'
GROUP BY k.identifier, k.title
ORDER BY k.identifier;
-- ATTESO: task_count = 5 per ogni Kanban, distinct_columns = 1

-- 3) luogo valorizzato, formato completo
SELECT COUNT(*) AS empty_luogo
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%'
  AND (t.luogo IS NULL OR btrim(t.luogo) = '' OR t.luogo NOT LIKE 'Via %');
-- ATTESO: empty_luogo = 0

-- 4) kanbanColumnId = column_id
SELECT COUNT(*) AS mismatched_columns
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%'
  AND t."kanbanColumnId" IS DISTINCT FROM t.column_id;
-- ATTESO: mismatched_columns = 0

-- 5) title = name, clientId valido sul site
SELECT COUNT(*) AS invalid_rows
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
LEFT JOIN public."Client" c ON c.id = t."clientId" AND c.site_id = t.site_id
WHERE t.unique_code LIKE 'DEMO-%'
  AND (t.title IS DISTINCT FROM t.name OR c.id IS NULL);
-- ATTESO: invalid_rows = 0

-- 6) 25 unique_code distinti con prefisso DEMO-
SELECT COUNT(*) AS codes, COUNT(DISTINCT unique_code) AS distinct_codes
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%';
-- ATTESO: codes = distinct_codes = 25

-- 7) Nessun site_id diverso da Benicchio
SELECT COUNT(*) AS orphan_tasks
FROM public."Task" t
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%' AND t.site_id <> s.id;
-- ATTESO: orphan_tasks = 0

-- 8) Distribuzione luoghi sulla mappa
SELECT t.luogo, COUNT(*) AS cnt
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%'
GROUP BY t.luogo
ORDER BY t.luogo;
-- ATTESO: 25 righe (località distinte), nessuna luogo vuoto
