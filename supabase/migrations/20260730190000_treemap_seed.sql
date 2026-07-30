-- Treemap Benicchio: seed demo deterministico + modulo treemap
-- Prerequisito: 20260730180000_treemap_schema.sql, clienti/task Benicchio

BEGIN;

DO $$
DECLARE
  v_site_id uuid;
  v_now timestamptz := date_trunc('hour', now());
  v_offline_at timestamptz := v_now - interval '4 days';
  v_client_lugano integer;
  v_client_bellinzona integer;
  v_client_keller integer;
  v_client_bern integer;
  v_task_prg integer;
  v_task_cst integer;
  r record;
BEGIN
  SELECT id INTO v_site_id FROM public.sites WHERE subdomain = 'benicchio';
  IF v_site_id IS NULL THEN RAISE EXCEPTION 'Site benicchio non trovato'; END IF;

  SELECT id INTO v_client_lugano FROM public."Client"
  WHERE site_id = v_site_id AND "businessName" = 'Città di Lugano';
  SELECT id INTO v_client_bellinzona FROM public."Client"
  WHERE site_id = v_site_id AND "businessName" = 'Città di Bellinzona';
  SELECT id INTO v_client_keller FROM public."Client"
  WHERE site_id = v_site_id AND "individualLastName" = 'Keller';
  SELECT id INTO v_client_bern FROM public."Client"
  WHERE site_id = v_site_id AND "individualLastName" = 'Bernasconi';
  SELECT id INTO v_task_prg FROM public."Task"
  WHERE site_id = v_site_id AND unique_code = 'DEMO-PRG-01';
  SELECT id INTO v_task_cst FROM public."Task"
  WHERE site_id = v_site_id AND unique_code = 'DEMO-CST-01';

  IF v_client_lugano IS NULL THEN RAISE EXCEPTION 'Cliente Città di Lugano non trovato'; END IF;
  IF v_client_bellinzona IS NULL THEN RAISE EXCEPTION 'Cliente Città di Bellinzona non trovato'; END IF;
  IF v_client_keller IS NULL THEN RAISE EXCEPTION 'Cliente Keller non trovato'; END IF;
  IF v_client_bern IS NULL THEN RAISE EXCEPTION 'Cliente Bernasconi non trovato'; END IF;
  IF v_task_prg IS NULL THEN RAISE EXCEPTION 'Task DEMO-PRG-01 non trovato'; END IF;
  IF v_task_cst IS NULL THEN RAISE EXCEPTION 'Task DEMO-CST-01 non trovato'; END IF;

  INSERT INTO public.site_modules (site_id, module_name, is_enabled)
  VALUES (v_site_id, 'treemap', true)
  ON CONFLICT (site_id, module_name) DO UPDATE SET is_enabled = true, updated_at = now();

  INSERT INTO public.tm_soglie (site_id, tipo, albero_id, verde_min, verde_max, giallo_min, giallo_max, direzione_criticita)
  SELECT v_site_id, v.tipo, NULL, v.vmin, v.vmax, v.ymin, v.ymax, v.dir
  FROM (VALUES
    ('DENDROMETRO'::public.tm_tipo_sensore,       -20::numeric,  80::numeric,  -80::numeric, -20::numeric, 'BASSO'),
    ('SAP_FLOW'::public.tm_tipo_sensore,            0.4::numeric,   3.0::numeric,  0.15::numeric, 0.4::numeric, 'BASSO'),
    ('UMIDITA_SUOLO'::public.tm_tipo_sensore,     22::numeric,   40::numeric,  15::numeric,  22::numeric, 'BASSO'),
    ('UMIDITA_CHIOMA'::public.tm_tipo_sensore,     65::numeric,   95::numeric,  50::numeric,  65::numeric, 'BASSO'),
    ('POTENZIALE_IDRICO'::public.tm_tipo_sensore,  -0.8::numeric, -0.1::numeric, -1.5::numeric, -0.8::numeric, 'BASSO'),
    ('UMIDITA_FOGLIARE'::public.tm_tipo_sensore,    0::numeric,   60::numeric,  60::numeric,  85::numeric, 'ALTO'),
    ('PAR'::public.tm_tipo_sensore,               300::numeric, 1800::numeric, 100::numeric, 300::numeric, 'BASSO'),
    ('INCLINOMETRO'::public.tm_tipo_sensore,        0::numeric,    1.5::numeric,  1.5::numeric,  3.0::numeric, 'ALTO'),
    ('CONDUCIBILITA_LEGNO'::public.tm_tipo_sensore, 5::numeric,   40::numeric,  40::numeric,  80::numeric, 'ALTO'),
    ('MICROCLIMA'::public.tm_tipo_sensore,          5::numeric,   28::numeric,  28::numeric,  34::numeric, 'ENTRAMBI')
  ) AS v(tipo, vmin, vmax, ymin, ymax, dir)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tm_soglie s
    WHERE s.site_id = v_site_id AND s.tipo = v.tipo AND s.albero_id IS NULL
  );

  INSERT INTO public.tm_alberi (
    site_id, codice, specie_comune, specie_botanica, latitude, longitude,
    indirizzo, comune, npa, altezza_m, diametro_tronco_cm, anno_piantumazione,
    "clientId", "taskId"
  )
  SELECT v_site_id, v.codice, v.specie, v.bot, v.lat, v.lng, v.ind, v.comune, v.npa,
    v.alt, v.diam, v.anno, v.cid, v.tid
  FROM (VALUES
    ('BEN-ALB-001','Tiglio','Tilia cordata',46.043800,8.933600,'Via Cantonale 1','Lamone','6814',12.0,45.0,1998,NULL::integer,v_task_prg),
    ('BEN-ALB-002','Acero di monte','Acer pseudoplatanus',46.041200,8.931100,'Via Industria 5','Lamone','6814',15.0,52.0,2005,NULL::integer,NULL::integer),
    ('BEN-ALB-003','Platano','Platanus × acerifolia',46.003500,8.951200,'Via Pretorio 12','Lugano','6900',18.0,68.0,1985,v_client_lugano,NULL::integer),
    ('BEN-ALB-004','Ginkgo','Ginkgo biloba',46.012100,8.960300,'Parco Ciani','Lugano','6900',14.0,41.0,1992,v_client_lugano,NULL::integer),
    ('BEN-ALB-005','Tiglio','Tilia cordata',46.008900,8.944500,'Via Nassa 8','Lugano','6900',16.0,55.0,1978,v_client_lugano,NULL::integer),
    ('BEN-ALB-006','Carpino bianco','Carpinus betulus',46.192800,8.987600,'Via Orico 3','Bellinzona','6500',11.0,38.0,2001,v_client_bellinzona,NULL::integer),
    ('BEN-ALB-007','Quercia farnia','Quercus robur',46.185600,8.991200,'Viale Stazione 20','Bellinzona','6500',20.0,72.0,1965,NULL::integer,NULL::integer),
    ('BEN-ALB-008','Faggio','Fagus sylvatica',46.170500,8.794300,'Via Ramogna 4','Locarno','6600',17.0,61.0,1988,NULL::integer,NULL::integer),
    ('BEN-ALB-009','Bagolaro','Celtis australis',46.170900,8.801100,'Lungolago Giardino','Locarno','6600',13.0,44.0,1995,v_client_bern,NULL::integer),
    ('BEN-ALB-010','Tiglio','Tilia cordata',45.870800,8.988500,'Via Maggiore 25','Mendrisio','6850',12.5,46.0,2003,NULL::integer,NULL::integer),
    ('BEN-ALB-011','Acero di monte','Acer pseudoplatanus',45.875100,8.981200,'Via Gaggiolo 7','Mendrisio','6850',14.0,49.0,2010,v_client_keller,v_task_cst),
    ('BEN-ALB-012','Platano','Platanus × acerifolia',46.172800,9.012400,'Piazza del Sole','Giubiasco','6512',19.0,70.0,1980,NULL::integer,NULL::integer)
  ) AS v(codice,specie,bot,lat,lng,ind,comune,npa,alt,diam,anno,cid,tid)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tm_alberi a WHERE a.site_id = v_site_id AND a.codice = v.codice
  );

  -- Sensori (idempotente su seriale)
  INSERT INTO public.tm_sensori (
    site_id, albero_id, tipo, etichetta, modello, seriale, unita_misura,
    intervallo_minuti, profondita_cm, altezza_installazione_cm, batteria_pct,
    ultimo_contatto_at, attivo
  )
  SELECT v_site_id, a.id, v.tipo::public.tm_tipo_sensore, v.etichetta, v.modello, v.seriale, v.unita,
    v.intervallo, v.prof, v.altezza, v.batt,
    CASE WHEN a.codice = 'BEN-ALB-009' THEN v_offline_at ELSE v_now END,
    CASE WHEN a.codice = 'BEN-ALB-009' THEN false ELSE true END
  FROM (VALUES
    ('BEN-ALB-001','UMIDITA_SUOLO','Sensore suolo 30 cm','TreeTalker TT+','TT-LAM-001','% VWC',60,30,NULL,88.0),
    ('BEN-ALB-001','UMIDITA_CHIOMA','Chioma IR','TreeTalker TT+','TT-LAM-002','%',60,NULL,450,91.0),
    ('BEN-ALB-002','UMIDITA_SUOLO','Suolo parcheggio','ESP32 + capacitive','TT-LAM-003','% VWC',60,25,NULL,85.0),
    ('BEN-ALB-002','DENDROMETRO','Dendrometro 1.3 m','LVDT dendro','TT-LAM-004','µm',60,NULL,130,90.0),
    ('BEN-ALB-003','UMIDITA_SUOLO','Suolo viale','TreeTalker TT+','TT-LUG-001','% VWC',60,35,NULL,92.0),
    ('BEN-ALB-003','UMIDITA_CHIOMA','Chioma','TreeTalker TT+','TT-LUG-002','%',60,NULL,500,89.0),
    ('BEN-ALB-004','UMIDITA_CHIOMA','Chioma ginkgo','TreeTalker TT+','TT-LUG-003','%',60,NULL,480,87.0),
    ('BEN-ALB-004','PAR','Radiazione PAR','PAR sensor','TT-LUG-004','µmol/m²/s',60,NULL,600,86.0),
    ('BEN-ALB-005','UMIDITA_SUOLO','Suolo stress','TreeTalker TT+','TT-LUG-005','% VWC',60,40,NULL,72.0),
    ('BEN-ALB-005','DENDROMETRO','Contrazione tronco','LVDT dendro','TT-LUG-006','µm',60,NULL,130,70.0),
    ('BEN-ALB-005','SAP_FLOW','Flusso linfa','Heat pulse','TT-LUG-007','l/h',60,NULL,150,68.0),
    ('BEN-ALB-006','UMIDITA_SUOLO','Suolo piazza','TreeTalker TT+','TT-BEL-001','% VWC',60,30,NULL,90.0),
    ('BEN-ALB-006','UMIDITA_CHIOMA','Chioma','TreeTalker TT+','TT-BEL-002','%',60,NULL,420,88.0),
    ('BEN-ALB-007','UMIDITA_SUOLO','Suolo giallo','TreeTalker TT+','TT-BEL-003','% VWC',60,35,NULL,80.0),
    ('BEN-ALB-007','UMIDITA_CHIOMA','Chioma','TreeTalker TT+','TT-BEL-004','%',60,NULL,440,79.0),
    ('BEN-ALB-008','UMIDITA_SUOLO','Suolo parco','TreeTalker TT+','TT-LOC-001','% VWC',60,28,NULL,91.0),
    ('BEN-ALB-008','DENDROMETRO','Dendrometro','LVDT','TT-LOC-002','µm',60,NULL,130,89.0),
    ('BEN-ALB-009','UMIDITA_SUOLO','Suolo offline','TreeTalker TT+','TT-LOC-003','% VWC',60,32,NULL,12.0),
    ('BEN-ALB-009','UMIDITA_CHIOMA','Chioma offline','TreeTalker TT+','TT-LOC-004','%',60,NULL,460,15.0),
    ('BEN-ALB-010','UMIDITA_SUOLO','Suolo giallo','TreeTalker TT+','TT-MEN-001','% VWC',60,30,NULL,78.0),
    ('BEN-ALB-010','UMIDITA_CHIOMA','Chioma','TreeTalker TT+','TT-MEN-002','%',60,NULL,430,77.0),
    ('BEN-ALB-011','UMIDITA_SUOLO','Suolo','TreeTalker TT+','TT-MEN-003','% VWC',60,25,NULL,76.0),
    ('BEN-ALB-011','DENDROMETRO','Dendrometro','LVDT','TT-MEN-004','µm',60,NULL,130,75.0),
    ('BEN-ALB-011','SAP_FLOW','Flusso','Heat pulse','TT-MEN-005','l/h',60,NULL,140,74.0),
    ('BEN-ALB-012','UMIDITA_SUOLO','Suolo','TreeTalker TT+','TT-GIU-001','% VWC',60,35,NULL,93.0),
    ('BEN-ALB-012','INCLINOMETRO','Inclinazione','Tilt sensor','TT-GIU-002','°',60,NULL,200,92.0),
    ('BEN-ALB-001','MICROCLIMA','Stazione Lamone','Weather micro','TT-LAM-MC','°C',60,NULL,250,95.0)
  ) AS v(codice,tipo,etichetta,modello,seriale,unita,intervallo,prof,altezza,batt)
  JOIN public.tm_alberi a ON a.site_id = v_site_id AND a.codice = v.codice
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tm_sensori s
    WHERE s.site_id = v_site_id AND s.seriale = v.seriale
  );

  -- Letture ultime 30 giorni, passo 1h, deterministiche
  FOR r IN
    SELECT s.id AS sensore_id, s.seriale, s.tipo, s.site_id, a.codice AS albero_codice
    FROM public.tm_sensori s
    JOIN public.tm_alberi a ON a.id = s.albero_id
    WHERE s.site_id = v_site_id AND s.deleted_at IS NULL
  LOOP
    INSERT INTO public.tm_letture (site_id, sensore_id, misurato_at, valore, qualita)
    SELECT
      r.site_id,
      r.sensore_id,
      ts,
      CASE
        -- ROSSO: suolo in calo + dendrometro in contrazione
        WHEN r.albero_codice = 'BEN-ALB-005' AND r.tipo = 'UMIDITA_SUOLO' THEN
          GREATEST(8::numeric, 32 - (EXTRACT(EPOCH FROM (v_now - ts)) / 3600.0 / 24.0) * 0.15
            - CASE WHEN ts > v_now - interval '7 days' THEN (7 - EXTRACT(EPOCH FROM (v_now - ts))/3600/24) * 1.2 ELSE 0 END)
        WHEN r.albero_codice = 'BEN-ALB-005' AND r.tipo = 'DENDROMETRO' THEN
          -45 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 5
        WHEN r.albero_codice = 'BEN-ALB-005' AND r.tipo = 'SAP_FLOW' THEN
          0.25 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 0.05
        -- GIALLO: valori in fascia gialla
        WHEN r.albero_codice IN ('BEN-ALB-007','BEN-ALB-010','BEN-ALB-011') AND r.tipo = 'UMIDITA_SUOLO' THEN
          17 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 2 + (abs(hashtext(r.seriale)) % 3)
        WHEN r.albero_codice IN ('BEN-ALB-007','BEN-ALB-010','BEN-ALB-011') AND r.tipo = 'UMIDITA_CHIOMA' THEN
          58 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 4
        -- OFFLINE: letture fino a 4 giorni fa
        WHEN r.albero_codice = 'BEN-ALB-009' THEN
          28 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 3 + (abs(hashtext(r.seriale)) % 5)
        -- VERDE default per tipo
        WHEN r.tipo = 'UMIDITA_SUOLO' THEN
          30 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 4 + (abs(hashtext(r.seriale)) % 5)
        WHEN r.tipo = 'UMIDITA_CHIOMA' THEN
          78 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 6
        WHEN r.tipo = 'DENDROMETRO' THEN
          25 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 8 + (abs(hashtext(r.seriale)) % 7)
        WHEN r.tipo = 'SAP_FLOW' THEN
          1.2 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 0.4
        WHEN r.tipo = 'PAR' THEN
          800 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 300
        WHEN r.tipo = 'INCLINOMETRO' THEN
          0.4 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 0.2
        WHEN r.tipo = 'MICROCLIMA' THEN
          16 + sin(EXTRACT(HOUR FROM ts) * pi() / 12) * 5
        ELSE 30 + (abs(hashtext(r.seriale || ts::text)) % 20)
      END,
      95
    FROM generate_series(v_now - interval '30 days', v_now, interval '1 hour') AS ts
    WHERE (r.albero_codice <> 'BEN-ALB-009' OR ts <= v_offline_at)
    ON CONFLICT (sensore_id, misurato_at) DO NOTHING;
  END LOOP;

END $$;

COMMIT;

-- =============================================================================
-- Verifiche (Passo 5)
-- =============================================================================

-- 1) Modulo solo Benicchio
SELECT s.subdomain, sm.module_name, sm.is_enabled
FROM public.site_modules sm
JOIN public.sites s ON s.id = sm.site_id
WHERE sm.module_name = 'treemap';
-- ATTESO: solo benicchio, is_enabled = true

-- 2) Conteggi
SELECT s.subdomain,
  (SELECT COUNT(*) FROM public.tm_alberi a WHERE a.site_id = s.id AND a.deleted_at IS NULL) AS alberi,
  (SELECT COUNT(*) FROM public.tm_sensori se WHERE se.site_id = s.id AND se.deleted_at IS NULL) AS sensori,
  (SELECT COUNT(*) FROM public.tm_letture l WHERE l.site_id = s.id) AS letture
FROM public.sites s WHERE s.subdomain = 'benicchio';

-- 3) Distribuzione stato_salute
SELECT stato_salute, COUNT(*) FROM public.vw_tm_alberi_mappa v
JOIN public.sites s ON s.id = v.site_id AND s.subdomain = 'benicchio'
GROUP BY stato_salute ORDER BY stato_salute;
-- ATTESO: 7 VERDE, 3 GIALLO, 1 ROSSO, 1 OFFLINE

-- 4) Fuori bbox
SELECT codice FROM public.tm_alberi a
JOIN public.sites s ON s.id = a.site_id AND s.subdomain = 'benicchio'
WHERE NOT (a.latitude BETWEEN 45.80 AND 46.65 AND a.longitude BETWEEN 8.35 AND 9.20);
-- ATTESO: 0

-- 5) RLS attiva
SELECT c.relname, c.relrowsecurity,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname LIKE 'tm_%' AND c.relkind = 'r';

-- 6) Non-regressione Santini
SELECT COUNT(*) FROM public."Task" t
JOIN public.sites s ON s.id = t.site_id AND s.subdomain = 'santini';
