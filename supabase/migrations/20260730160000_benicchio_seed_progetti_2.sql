-- Migration: Benicchio — +25 progetti demo (06–10) e categorizzazione draft_category_ids
-- Progetto: jzxffusiwtrvjwmpjztu (Full Data Manager)
-- Prerequisito: 20260730150000_benicchio_seed_progetti.sql
--
-- PARTE A: 25 nuovi Task DEMO-*-06..10 con draft_category_ids in INSERT
-- PARTE B: UPDATE draft_category_ids sui 25 task DEMO-*-01..05 esistenti
--
-- Colonne Kanban: prefisso benicchio_ (20260730100000_site_benicchio.sql)
-- draft_category_ids → sellproduct_categories.id (risolti per name a runtime)
--
-- NOTA: verifica duplicati Kanban Progettazione — se stesso unique_code compare
-- due volte, segnalato con RAISE NOTICE; nessuna DELETE automatica.

BEGIN;

DO $$
DECLARE
  v_site_id uuid;

  v_cat_progettazione integer;
  v_cat_opere         integer;
  v_cat_irrigazione   integer;
  v_cat_verde         integer;
  v_cat_manutenzione  integer;

  v_kanban_id integer;
  v_col_id    integer;
  v_rows      integer;
  v_dup_count integer;
BEGIN
  SELECT id INTO v_site_id FROM public.sites WHERE subdomain = 'benicchio';
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site benicchio non trovato';
  END IF;

  SELECT id INTO v_cat_progettazione FROM public.sellproduct_categories
  WHERE site_id = v_site_id AND name = 'Progettazione';
  SELECT id INTO v_cat_opere FROM public.sellproduct_categories
  WHERE site_id = v_site_id AND name = 'Opere da giardiniere';
  SELECT id INTO v_cat_irrigazione FROM public.sellproduct_categories
  WHERE site_id = v_site_id AND name = 'Irrigazione';
  SELECT id INTO v_cat_verde FROM public.sellproduct_categories
  WHERE site_id = v_site_id AND name = 'Verde e piantumazione';
  SELECT id INTO v_cat_manutenzione FROM public.sellproduct_categories
  WHERE site_id = v_site_id AND name = 'Manutenzione';

  IF v_cat_progettazione IS NULL OR v_cat_opere IS NULL OR v_cat_irrigazione IS NULL
     OR v_cat_verde IS NULL OR v_cat_manutenzione IS NULL THEN
    RAISE EXCEPTION 'Categorie sellproduct_categories incomplete per Benicchio';
  END IF;

  -- Controllo anomalia duplicati su Kanban Progettazione (primo lotto)
  SELECT COUNT(*) - COUNT(DISTINCT t.unique_code) INTO v_dup_count
  FROM public."Task" t
  JOIN public."Kanban" k ON k.id = t."kanbanId"
  WHERE t.site_id = v_site_id
    AND k.identifier = '1_progettazione'
    AND t.unique_code LIKE 'DEMO-%';

  IF v_dup_count > 0 THEN
    RAISE NOTICE 'ATTENZIONE: trovati % duplicati unique_code su Kanban Progettazione — verificare manualmente', v_dup_count;
  END IF;

  ---------------------------------------------------------------------------
  -- PARTE A — Offerte 06–10
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id AND k.identifier = '0_offerte'
    AND c.identifier = 'benicchio_to_do_0_offerte';
  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna non risolta: 0_offerte';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, draft_category_ids,
    "deliveryDate", termine_produzione
  )
  SELECT v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key) LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo, v.prezzo, v.pezzi, v.codice, v.cats,
    (CURRENT_DATE + v.giorni)::timestamp, CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Preventivo giardino roccioso con graminacee', 'Via Monte San Giorgio 8, 6864 Arzo',
     9200::float8, NULL::numeric, 'DEMO-OFF-06', 'Pedrazzini', 40::integer, ARRAY[v_cat_verde]::integer[]),
    ('Offerta sistema irrigazione a goccia orto urbano', 'Via Industria 22, 6934 Bioggio',
     4800::float8, NULL::numeric, 'DEMO-OFF-07', 'Neri', 35::integer, ARRAY[v_cat_irrigazione]::integer[]),
    ('Preventivo pavimentazione vialetto in porfido', 'Via Mulino 3, 6718 Olivone',
     11200::float8, 28::numeric, 'DEMO-OFF-08', 'Ferramenta Tre Valli SA', 50::integer, ARRAY[v_cat_opere]::integer[]),
    ('Offerta manutenzione annuale giardino condominiale', 'Via Campo 6, 6986 Novaggio',
     9600::float8, NULL::numeric, 'DEMO-OFF-09', 'Amministrazione Stabili Luganese SA', 45::integer, ARRAY[v_cat_manutenzione]::integer[]),
    ('Progetto illuminazione e arredo giardino', 'Via al Lago 18, 6987 Mugena',
     7400::float8, NULL::numeric, 'DEMO-OFF-10', 'Immobiliare Collina d''Oro SA', 55::integer, ARRAY[v_cat_progettazione]::integer[])
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni, cats)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Progettazione 06–10
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id AND k.identifier = '1_progettazione'
    AND c.identifier = 'benicchio_to_do_1_progettazione';
  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna non risolta: 1_progettazione';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, draft_category_ids,
    "deliveryDate", termine_produzione
  )
  SELECT v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key) LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo, v.prezzo, v.pezzi, v.codice, v.cats,
    (CURRENT_DATE + v.giorni)::timestamp, CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Progetto rain garden e drenaggio', 'Via Municipio 1, 6982 Agno',
     6800::float8, NULL::numeric, 'DEMO-PRG-06', 'Comune di Agno', 48::integer, ARRAY[v_cat_progettazione]::integer[]),
    ('Piano piantumazione siepe frangivento', 'Via Municipio 2, 6855 Stabio',
     3900::float8, 60::numeric, 'DEMO-PRG-07', 'Comune di Stabio', 52::integer, ARRAY[v_cat_verde]::integer[]),
    ('Studio impianto irrigazione parco', 'Via Municipio 3, 6883 Novazzano',
     8200::float8, NULL::numeric, 'DEMO-PRG-08', 'Città di Chiasso', 58::integer, ARRAY[v_cat_irrigazione]::integer[]),
    ('Progetto muri di sostegno in pietra', 'Via Magoria 7, 6648 Minusio',
     11500::float8, NULL::numeric, 'DEMO-PRG-09', 'Studio Immobiliare Piano SA', 62::integer, ARRAY[v_cat_opere]::integer[]),
    ('Piano manutenzione pluriennale alberature', 'Via Cantonale 78, 6573 Magadino',
     22000::float8, NULL::numeric, 'DEMO-PRG-10', 'Città di Lugano', 68::integer, ARRAY[v_cat_manutenzione]::integer[])
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni, cats)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Costruzione 06–10
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id AND k.identifier = '2_costruzione'
    AND c.identifier = 'benicchio_to_do_2_costruzione';
  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna non risolta: 2_costruzione';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, draft_category_ids,
    "deliveryDate", termine_produzione
  )
  SELECT v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key) LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo, v.prezzo, v.pezzi, v.codice, v.cats,
    (CURRENT_DATE + v.giorni)::timestamp, CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Posa pavimentazione e cordoli in granito', 'Via Municipio 6, 6593 Cadenazzo',
     24500::float8, 55::numeric, 'DEMO-CST-06', 'Gestioni Tre Valli Sagl', 70::integer, ARRAY[v_cat_opere]::integer[]),
    ('Installazione centralina e linee goccia', 'Via San Gottardo 45, 6760 Faido',
     16800::float8, NULL::numeric, 'DEMO-CST-07', 'Ticino Irrigazione Sagl', 75::integer, ARRAY[v_cat_irrigazione]::integer[]),
    ('Messa a dimora alberature stradali', 'Via della Stazione 11, 6780 Airolo',
     32000::float8, 8::numeric, 'DEMO-CST-08', 'Comune di Cadenazzo', 80::integer, ARRAY[v_cat_verde]::integer[]),
    ('Costruzione scalinata e muretto fioriera', 'Via Naviglio 4, 6535 Roveredo',
     19800::float8, NULL::numeric, 'DEMO-CST-09', 'Keller', 85::integer, ARRAY[v_cat_opere]::integer[]),
    ('Realizzazione prato in rotoli e semina', 'Via al Chiesa 9, 6877 Coldrerio',
     13400::float8, 420::numeric, 'DEMO-CST-10', 'Fontana', 90::integer, ARRAY[v_cat_verde]::integer[])
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni, cats)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Manutenzione 06–10
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id AND k.identifier = '3_manutenzione'
    AND c.identifier = 'benicchio_to_do_3_manutenzione';
  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna non risolta: 3_manutenzione';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, draft_category_ids,
    "deliveryDate", termine_produzione
  )
  SELECT v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key) LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo, v.prezzo, v.pezzi, v.codice, v.cats,
    (CURRENT_DATE + v.giorni)::timestamp, CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Potatura siepi e cordonatura aiuole', 'Via Roma 14, 6835 Balerna',
     3800::float8, NULL::numeric, 'DEMO-MAN-06', 'Gestioni Immobiliari Ceresio Sagl', 28::integer, ARRAY[v_cat_manutenzione]::integer[]),
    ('Manutenzione impianto irrigazione stagionale', 'Via Industria 8, 6832 Morbio Inferiore',
     2400::float8, NULL::numeric, 'DEMO-MAN-07', 'Patrimoni & Stabili SA', 32::integer, ARRAY[v_cat_manutenzione]::integer[]),
    ('Sfalcio scarpate area industriale', 'Via Cantonale 55, 6834 Cadempino',
     5600::float8, 1200::numeric, 'DEMO-MAN-08', 'Comune di Losone', 38::integer, ARRAY[v_cat_manutenzione]::integer[]),
    ('Concimazione e arieggiatura tappeti erbosi', 'Via Monte 3, 6968 Sonvico',
     4200::float8, 800::numeric, 'DEMO-MAN-09', 'Comune di Minusio', 42::integer, ARRAY[v_cat_manutenzione]::integer[]),
    ('Abbattimento e sostituzione alberi malati', 'Via Bosco 12, 6951 Vigano',
     8900::float8, 4::numeric, 'DEMO-MAN-10', 'Città di Mendrisio', 48::integer, ARRAY[v_cat_manutenzione]::integer[])
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni, cats)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- Fatture OUT 06–10
  ---------------------------------------------------------------------------
  SELECT k.id, c.id INTO v_kanban_id, v_col_id
  FROM public."Kanban" k
  JOIN public."KanbanColumn" c ON c."kanbanId" = k.id
  WHERE k.site_id = v_site_id AND k.identifier = 'fatture'
    AND c.identifier = 'benicchio_to_do_fatture';
  IF v_kanban_id IS NULL OR v_col_id IS NULL THEN
    RAISE EXCEPTION 'Kanban/colonna non risolta: fatture';
  END IF;

  INSERT INTO public."Task" (
    title, name, site_id, "kanbanId", "kanbanColumnId", column_id, column_position,
    "clientId", task_type, is_draft, archived, status, luogo,
    "sellPrice", numero_pezzi, unique_code, draft_category_ids,
    "deliveryDate", termine_produzione
  )
  SELECT v.title, v.title, v_site_id, v_kanban_id, v_col_id, v_col_id, 1,
    COALESCE(
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id
         AND (cl."businessName" = v.client_key OR cl."individualLastName" = v.client_key) LIMIT 1),
      (SELECT cl.id FROM public."Client" cl WHERE cl.site_id = v_site_id ORDER BY cl.id LIMIT 1)
    ),
    'LAVORO', false, false, 'todo', v.luogo, v.prezzo, v.pezzi, v.codice, v.cats,
    (CURRENT_DATE + v.giorni)::timestamp, CURRENT_DATE + v.giorni
  FROM (VALUES
    ('Fattura posa pavimentazione', 'Via al Ponte 6, 6916 Lopagno',
     19800::float8, NULL::numeric, 'DEMO-FAT-06', 'Bernasconi', 22::integer, ARRAY[v_cat_opere]::integer[]),
    ('Fattura impianto irrigazione giardino privato', 'Via Cantonale 20, 6928 Manno',
     17600::float8, NULL::numeric, 'DEMO-FAT-07', 'Rossi', 26::integer, ARRAY[v_cat_irrigazione]::integer[]),
    ('Fattura fornitura e posa siepe', 'Via della Grotta 2, 6924 Sessa',
     6200::float8, 45::numeric, 'DEMO-FAT-08', 'Amministrazioni Verbano SA', 30::integer, ARRAY[v_cat_verde]::integer[]),
    ('Fattura progetto giardino', 'Via Molinazzo 11, 6933 Muzzano',
     5400::float8, NULL::numeric, 'DEMO-FAT-09', 'Müller', 34::integer, ARRAY[v_cat_progettazione]::integer[]),
    ('Fattura contratto manutenzione semestrale', 'Via Selva 14, 6814 Lamone',
     4800::float8, NULL::numeric, 'DEMO-FAT-10', 'Città di Bellinzona', 38::integer, ARRAY[v_cat_manutenzione]::integer[])
  ) AS v(title, luogo, prezzo, pezzi, codice, client_key, giorni, cats)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Task" t WHERE t.site_id = v_site_id AND t.unique_code = v.codice
  );

  ---------------------------------------------------------------------------
  -- PARTE B — categorizzazione primo lotto (DEMO-*-01..05)
  ---------------------------------------------------------------------------

  -- Offerte: deduzione dal titolo
  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-OFF-01';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_irrigazione]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-OFF-02';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-OFF-03';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-OFF-04';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-OFF-05';

  -- Progettazione: default Progettazione
  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_progettazione]::integer[]
  WHERE site_id = v_site_id AND unique_code IN (
    'DEMO-PRG-01', 'DEMO-PRG-02', 'DEMO-PRG-03', 'DEMO-PRG-04', 'DEMO-PRG-05'
  );

  -- Costruzione: per contenuto
  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_opere]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-CST-01';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_irrigazione]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-CST-02';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-CST-03';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-CST-04';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_opere]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-CST-05';

  -- Manutenzione
  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_manutenzione]::integer[]
  WHERE site_id = v_site_id AND unique_code IN (
    'DEMO-MAN-01', 'DEMO-MAN-02', 'DEMO-MAN-03', 'DEMO-MAN-04', 'DEMO-MAN-05'
  );

  -- Fatture: deduzione dal titolo
  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-FAT-01';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_manutenzione]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-FAT-02';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_irrigazione]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-FAT-03';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_verde]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-FAT-04';

  UPDATE public."Task" SET draft_category_ids = ARRAY[v_cat_manutenzione]::integer[]
  WHERE site_id = v_site_id AND unique_code = 'DEMO-FAT-05';

  -- Fallback: task demo rimasti senza categoria (es. duplicato anomalo su Progettazione)
  UPDATE public."Task" t SET draft_category_ids = ARRAY[v_cat_progettazione]::integer[]
  FROM public."Kanban" k
  WHERE t."kanbanId" = k.id AND t.site_id = v_site_id
    AND t.unique_code LIKE 'DEMO-%'
    AND k.identifier = '1_progettazione'
    AND (t.draft_category_ids IS NULL OR cardinality(t.draft_category_ids) = 0);

  UPDATE public."Task" t SET draft_category_ids = ARRAY[v_cat_opere]::integer[]
  FROM public."Kanban" k
  WHERE t."kanbanId" = k.id AND t.site_id = v_site_id
    AND t.unique_code LIKE 'DEMO-%'
    AND k.identifier = '2_costruzione'
    AND (t.draft_category_ids IS NULL OR cardinality(t.draft_category_ids) = 0);

  UPDATE public."Task" t SET draft_category_ids = ARRAY[v_cat_manutenzione]::integer[]
  FROM public."Kanban" k
  WHERE t."kanbanId" = k.id AND t.site_id = v_site_id
    AND t.unique_code LIKE 'DEMO-%'
    AND k.identifier = '3_manutenzione'
    AND (t.draft_category_ids IS NULL OR cardinality(t.draft_category_ids) = 0);

  -- Verifiche inline
  SELECT COUNT(*) INTO v_rows
  FROM public."Task" t
  WHERE t.site_id = v_site_id
    AND t.unique_code ~ 'DEMO-[A-Z]+-(0[6-9]|10)$';

  IF v_rows <> 25 THEN
    RAISE EXCEPTION 'Attesi 25 task DEMO-*-06..10, trovati %', v_rows;
  END IF;

  SELECT COUNT(*) INTO v_rows
  FROM public."Task" t
  WHERE t.site_id = v_site_id AND t.unique_code LIKE 'DEMO-%';

  IF v_rows < 50 THEN
    RAISE EXCEPTION 'Attesi almeno 50 task DEMO-* su Benicchio, trovati %', v_rows;
  END IF;

  IF v_rows > 50 THEN
    RAISE NOTICE 'Task demo totali = % (>50): possibile duplicato su Kanban Progettazione — verificare manualmente', v_rows;
  END IF;

  SELECT COUNT(*) INTO v_rows
  FROM public."Task" t
  WHERE t.site_id = v_site_id AND t.unique_code LIKE 'DEMO-%'
    AND (t.draft_category_ids IS NULL OR cardinality(t.draft_category_ids) = 0);

  IF v_rows > 0 THEN
    RAISE EXCEPTION 'Task demo senza draft_category_ids: %', v_rows;
  END IF;

  SELECT COUNT(*) INTO v_rows
  FROM public."Task" t
  WHERE t.site_id = v_site_id AND t.unique_code LIKE 'DEMO-%'
    AND (t.luogo IS NULL OR btrim(t.luogo) = '');

  IF v_rows > 0 THEN
    RAISE EXCEPTION 'Task demo senza luogo (mappa): %', v_rows;
  END IF;

  -- Tutte e 5 le categorie devono comparire almeno una volta
  IF (SELECT COUNT(DISTINCT unnest_cat) FROM (
    SELECT unnest(t.draft_category_ids) AS unnest_cat
    FROM public."Task" t
    WHERE t.site_id = v_site_id AND t.unique_code LIKE 'DEMO-%'
  ) x) <> 5 THEN
    RAISE EXCEPTION 'Distribuzione categorie incompleta: attese 5 categorie distinte';
  END IF;

END $$;

COMMIT;

-- =============================================================================
-- 5. Verifiche di accettazione
-- =============================================================================

-- 1) >=50 task demo totali (51 se duplicato Progettazione); lotto 06–10 = 25
SELECT
  COUNT(*) FILTER (WHERE unique_code LIKE 'DEMO-%') AS total_demo,
  COUNT(*) FILTER (WHERE unique_code ~ 'DEMO-[A-Z]+-(0[6-9]|10)$') AS lotto_2
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio';
-- ATTESO: total_demo >= 50, lotto_2 = 25

-- 2) 5 per Kanban nel lotto 06–10
SELECT k.identifier, COUNT(*) AS cnt
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
JOIN public."Kanban" k ON k.id = t."kanbanId"
WHERE t.unique_code ~ 'DEMO-[A-Z]+-(0[6-9]|10)$'
GROUP BY k.identifier ORDER BY k.identifier;
-- ATTESO: cnt = 5 per ogni Kanban

-- 3) Nessun draft_category_ids vuoto su task demo
SELECT COUNT(*) AS empty_cats
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%'
  AND (t.draft_category_ids IS NULL OR cardinality(t.draft_category_ids) = 0);
-- ATTESO: empty_cats = 0

-- 4) Categorie solo del site Benicchio
SELECT COUNT(*) AS foreign_cats
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
CROSS JOIN unnest(t.draft_category_ids) AS cat_id
LEFT JOIN public.sellproduct_categories sc
  ON sc.id = cat_id AND sc.site_id = t.site_id
WHERE t.unique_code LIKE 'DEMO-%' AND sc.id IS NULL;
-- ATTESO: foreign_cats = 0

-- 5) Distribuzione per categoria
SELECT sc.name, COUNT(*) AS task_refs
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
CROSS JOIN unnest(t.draft_category_ids) AS cat_id
JOIN public.sellproduct_categories sc ON sc.id = cat_id
WHERE t.unique_code LIKE 'DEMO-%'
GROUP BY sc.name ORDER BY sc.name;
-- ATTESO: 5 righe, tutte count > 0

-- 6) luogo valorizzato su tutti i demo
SELECT COUNT(*) AS missing_luogo
FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%'
  AND (t.luogo IS NULL OR btrim(t.luogo) NOT LIKE 'Via %');
-- ATTESO: missing_luogo = 0

-- 7) Nessun orphan site_id
SELECT COUNT(*) AS orphan
FROM public."Task" t
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE t.unique_code LIKE 'DEMO-%' AND t.site_id <> s.id;
-- ATTESO: orphan = 0
