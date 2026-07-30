-- Migration: clienti demo per Benicchio SA (giardinaggio, Canton Ticino)
-- Progetto: jzxffusiwtrvjwmpjztu (Full Data Manager)
-- Prerequisito: site benicchio creato (20260730_site_benicchio.sql)
--
-- NOTA SICUREZZA: la tabella Client ha RLS disattivata in questo progetto.
-- Solo dati fittizi (@example.ch, nomi inventati). Non inserire clienti reali
-- finché la RLS per site_id non è attiva e testata.

BEGIN;

DO $$
DECLARE
  v_site_id uuid;
BEGIN
  SELECT id INTO v_site_id
  FROM public.sites
  WHERE subdomain = 'benicchio';

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site benicchio non trovato. Applicare prima la migration 20260730_site_benicchio.sql';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2a. Città ticinesi (5) — BUSINESS, contactPeople obbligatorio
  -- ---------------------------------------------------------------------------
  INSERT INTO public."Client" (
    "clientType", "clientLanguage", "businessName",
    "city", "zipCode", "address", "email", "landlinePhone", "mobilePhone",
    "code", "contactPeople", "countryCode", "site_id"
  )
  SELECT
    'BUSINESS'::public."ClientType",
    'Italiano',
    v.name,
    v.city,
    v.zip,
    v.addr,
    v.email,
    v.phone,
    NULL,
    '',
    v.contacts::jsonb,
    'CH',
    v_site_id
  FROM (VALUES
    (
      'Città di Lugano',
      'Lugano', 6900,
      'Piazza della Riforma 8',
      'verde.lugano@example.ch',
      '+41 91 815 31 11',
      '[{"name": "Dott. Luca Bianchi", "role": "Ufficio del verde pubblico", "email": "l.bianchi@example.ch", "phone": "+41 91 815 31 20"}]'
    ),
    (
      'Città di Bellinzona',
      'Bellinzona', 6500,
      'Piazza Collegiata 19',
      'tecnico.bellinzona@example.ch',
      '+41 91 825 21 21',
      '[{"name": "Ing. Marco Pedrazzini", "role": "Ufficio tecnico comunale", "email": "m.pedrazzini@example.ch", "phone": "+41 91 825 21 45"}]'
    ),
    (
      'Città di Locarno',
      'Locarno', 6600,
      'Piazza Grande 4',
      'spaziverdi.locarno@example.ch',
      '+41 91 756 31 31',
      '[{"name": "Sig.ra Elena Fontana", "role": "Servizio spazi verdi", "email": "e.fontana@example.ch", "phone": "+41 91 756 31 58"}]'
    ),
    (
      'Città di Mendrisio',
      'Mendrisio', 6850,
      'Via Maggiore 13',
      'lavoripubblici.mendrisio@example.ch',
      '+41 91 640 41 41',
      '[{"name": "Dott. Paolo Neri", "role": "Ufficio lavori pubblici", "email": "p.neri@example.ch", "phone": "+41 91 640 41 72"}]'
    ),
    (
      'Città di Chiasso',
      'Chiasso', 6830,
      'Piazza Volta 12',
      'manutenzioni.chiasso@example.ch',
      '+41 91 683 51 51',
      '[{"name": "Sig. Roberto Galli", "role": "Ufficio manutenzioni", "email": "r.galli@example.ch", "phone": "+41 91 683 51 88"}]'
    )
  ) AS v(name, city, zip, addr, email, phone, contacts)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Client" c
    WHERE c.site_id = v_site_id AND c."businessName" = v.name
  );

  -- ---------------------------------------------------------------------------
  -- 2b. Comuni ticinesi (10) — BUSINESS, contactPeople obbligatorio
  -- ---------------------------------------------------------------------------
  INSERT INTO public."Client" (
    "clientType", "clientLanguage", "businessName",
    "city", "zipCode", "address", "email", "landlinePhone", "mobilePhone",
    "code", "contactPeople", "countryCode", "site_id"
  )
  SELECT
    'BUSINESS'::public."ClientType",
    'Italiano',
    v.name,
    v.city,
    v.zip,
    v.addr,
    v.email,
    v.phone,
    NULL,
    '',
    v.contacts::jsonb,
    'CH',
    v_site_id
  FROM (VALUES
    (
      'Comune di Caslano',
      'Caslano', 6987,
      'Via Cantonale 42',
      'comune.caslano@example.ch',
      '+41 91 735 60 10',
      '[{"name": "Sig.ra Giulia Bernasconi", "role": "Ufficio tecnico", "email": "g.bernasconi@example.ch", "phone": "+41 91 735 60 18"}]'
    ),
    (
      'Comune di Losone',
      'Losone', 6616,
      'Via San Gottardo 62',
      'comune.losone@example.ch',
      '+41 91 791 41 41',
      '[{"name": "Ing. Thomas Müller", "role": "Ufficio lavori pubblici", "email": "t.mueller@example.ch", "phone": "+41 91 791 41 55"}]'
    ),
    (
      'Comune di Ascona',
      'Ascona', 6612,
      'Via Borgo 4',
      'comune.ascona@example.ch',
      '+41 91 791 01 01',
      '[{"name": "Dott. Anna Keller", "role": "Servizio verde pubblico", "email": "a.keller@example.ch", "phone": "+41 91 791 01 22"}]'
    ),
    (
      'Comune di Minusio',
      'Minusio', 6648,
      'Via Magoria 13',
      'comune.minusio@example.ch',
      '+41 91 750 51 51',
      '[{"name": "Sig. Luca Pedrazzini", "role": "Ufficio tecnico comunale", "email": "l.pedrazzini@example.ch", "phone": "+41 91 750 51 66"}]'
    ),
    (
      'Comune di Gambarogno',
      'Magadino', 6573,
      'Via Cantonale 78',
      'comune.gambarogno@example.ch',
      '+41 91 795 11 11',
      '[{"name": "Sig.ra Sophie Martin", "role": "Ufficio del verde", "email": "s.martin@example.ch", "phone": "+41 91 795 11 28"}]'
    ),
    (
      'Comune di Capriasca',
      'Tesserete', 6950,
      'Via al Chioso 5',
      'comune.capriasca@example.ch',
      '+41 91 960 11 11',
      '[{"name": "Dott. Marco Rossi", "role": "Ufficio lavori pubblici", "email": "m.rossi@example.ch", "phone": "+41 91 960 11 34"}]'
    ),
    (
      'Comune di Agno',
      'Agno', 6982,
      'Via Municipio 1',
      'comune.agno@example.ch',
      '+41 91 605 12 12',
      '[{"name": "Ing. Chiara Vogel", "role": "Ufficio tecnico", "email": "c.vogel@example.ch", "phone": "+41 91 605 12 27"}]'
    ),
    (
      'Comune di Stabio',
      'Stabio', 6855,
      'Via Municipio 2',
      'comune.stabio@example.ch',
      '+41 91 640 70 70',
      '[{"name": "Sig. Paolo Conti", "role": "Servizio manutenzioni", "email": "p.conti@example.ch", "phone": "+41 91 640 70 85"}]'
    ),
    (
      'Comune di Novazzano',
      'Novazzano', 6883,
      'Via Municipio 3',
      'comune.novazzano@example.ch',
      '+41 91 640 80 80',
      '[{"name": "Sig.ra Elena Brambilla", "role": "Ufficio tecnico comunale", "email": "e.brambilla@example.ch", "phone": "+41 91 640 80 93"}]'
    ),
    (
      'Comune di Cadenazzo',
      'Cadenazzo', 6593,
      'Via Municipio 6',
      'comune.cadenazzo@example.ch',
      '+41 91 850 11 11',
      '[{"name": "Dott. Fabio Rizzo", "role": "Ufficio lavori pubblici", "email": "f.rizzo@example.ch", "phone": "+41 91 850 11 26"}]'
    )
  ) AS v(name, city, zip, addr, email, phone, contacts)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Client" c
    WHERE c.site_id = v_site_id AND c."businessName" = v.name
  );

  -- ---------------------------------------------------------------------------
  -- 2c. Amministrazioni immobiliari (10) — BUSINESS, contactPeople con PM
  -- ---------------------------------------------------------------------------
  INSERT INTO public."Client" (
    "clientType", "clientLanguage", "businessName",
    "city", "zipCode", "address", "email", "landlinePhone", "mobilePhone",
    "code", "contactPeople", "countryCode", "site_id"
  )
  SELECT
    'BUSINESS'::public."ClientType",
    'Italiano',
    v.name,
    v.city,
    v.zip,
    v.addr,
    v.email,
    v.phone,
    NULL,
    '',
    v.contacts::jsonb,
    'CH',
    v_site_id
  FROM (VALUES
    (
      'Gestioni Immobiliari Ceresio Sagl',
      'Lugano', 6900,
      'Via Nassa 20',
      'info.ceresio@example.ch',
      '+41 91 923 40 10',
      '[{"name": "Sig.ra Monica Ferrini", "role": "Responsabile stabili", "email": "m.ferrini@example.ch", "phone": "+41 79 412 33 01"}]'
    ),
    (
      'Amministrazioni Verbano SA',
      'Locarno', 6600,
      'Via Ramogna 12',
      'info.verbano@example.ch',
      '+41 91 751 20 30',
      '[{"name": "Dott. Stefano Marchetti", "role": "Property manager", "email": "s.marchetti@example.ch", "phone": "+41 79 523 44 12"}]'
    ),
    (
      'Fiduciaria Immobiliare Momò SA',
      'Mendrisio', 6850,
      'Via Luigi Cagliero 5',
      'info.momo@example.ch',
      '+41 91 640 55 60',
      '[{"name": "Sig.ra Laura Giani", "role": "Responsabile patrimoni", "email": "l.giani@example.ch", "phone": "+41 79 634 88 20"}]'
    ),
    (
      'Studio Immobiliare Piano SA',
      'Bellinzona', 6500,
      'Via Orico 28',
      'info.piano@example.ch',
      '+41 91 825 90 40',
      '[{"name": "Ing. Davide Solari", "role": "Responsabile stabili", "email": "d.solari@example.ch", "phone": "+41 79 301 77 45"}]'
    ),
    (
      'Regie del Malcantone Sagl',
      'Caslano', 6987,
      'Via Lugano 15',
      'info.malcantone@example.ch',
      '+41 91 735 80 20',
      '[{"name": "Sig. Andrea Cavadini", "role": "Property manager", "email": "a.cavadini@example.ch", "phone": "+41 79 812 66 33"}]'
    ),
    (
      'Patrimoni & Stabili SA',
      'Paradiso', 6900,
      'Via Vincenzo Vela 8',
      'info.patrimoni@example.ch',
      '+41 91 994 12 12',
      '[{"name": "Sig.ra Nina Baumann", "role": "Responsabile amministrativo", "email": "n.baumann@example.ch", "phone": "+41 79 455 90 18"}]'
    ),
    (
      'Gestione Condomini Riviera Sagl',
      'Biasca', 6710,
      'Via Stazione 22',
      'info.riviera@example.ch',
      '+41 91 862 30 50',
      '[{"name": "Dott. Gianni Soldini", "role": "Responsabile stabili", "email": "g.soldini@example.ch", "phone": "+41 79 667 12 09"}]'
    ),
    (
      'Immobiliare Collina d''Oro SA',
      'Montagnola', 6926,
      'Via Collina d''Oro 14',
      'info.collina@example.ch',
      '+41 91 993 45 60',
      '[{"name": "Sig.ra Valentina Rusca", "role": "Property manager", "email": "v.rusca@example.ch", "phone": "+41 79 744 55 21"}]'
    ),
    (
      'Amministrazione Stabili Luganese SA',
      'Massagno', 6900,
      'Via Cantonale 98',
      'info.luganese@example.ch',
      '+41 91 968 70 30',
      '[{"name": "Sig. Matteo Colombo", "role": "Responsabile stabili", "email": "m.colombo@example.ch", "phone": "+41 79 388 44 70"}]'
    ),
    (
      'Gestioni Tre Valli Sagl',
      'Faido', 6760,
      'Via San Gottardo 45',
      'info.trevali@example.ch',
      '+41 91 864 12 80',
      '[{"name": "Sig.ra Silvia Camenisch", "role": "Responsabile patrimoni", "email": "s.camenisch@example.ch", "phone": "+41 79 555 33 14"}]'
    )
  ) AS v(name, city, zip, addr, email, phone, contacts)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Client" c
    WHERE c.site_id = v_site_id AND c."businessName" = v.name
  );

  -- ---------------------------------------------------------------------------
  -- 2d. Clienti privati (10) — INDIVIDUAL
  -- ---------------------------------------------------------------------------
  INSERT INTO public."Client" (
    "clientType", "clientLanguage",
    "individualTitle", "individualFirstName", "individualLastName",
    "businessName",
    "city", "zipCode", "address", "email", "mobilePhone", "landlinePhone",
    "code", "contactPeople", "countryCode", "site_id"
  )
  SELECT
    'INDIVIDUAL'::public."ClientType",
    'Italiano',
    v.title,
    v.first_name,
    v.last_name,
    NULL,
    v.city,
    v.zip,
    v.addr,
    v.email,
    v.mobile,
    NULL,
    v.code,
    '[]'::jsonb,
    'CH',
    v_site_id
  FROM (VALUES
    ('Sig.',   'Marco',    'Rossi',       'Pregassona', 6963, 'Via ai Grotti 18',  'marco.rossi@example.ch',       '+41 79 301 22 10', 'MaRo'),
    ('Sig.ra', 'Elena',    'Fontana',     'Viganello',  6962, 'Via Lugano 44',     'elena.fontana@example.ch',     '+41 79 412 55 88', 'ElFo'),
    ('Sig.',   'Thomas',   'Müller',      'Tenero',     6598, 'Via Brere 6',       'thomas.mueller@example.ch',    '+41 79 523 77 01', 'ThMu'),
    ('Sig.ra', 'Giulia',   'Bernasconi',  'Gordola',    6646, 'Via Cantonale 112', 'giulia.bernasconi@example.ch', '+41 79 634 44 92', 'GiBe'),
    ('Sig.',   'Luca',     'Pedrazzini',  'Cademario',  6938, 'Via Collina 3',     'luca.pedrazzini@example.ch',   '+41 79 812 33 67', 'LuPe'),
    ('Sig.ra', 'Anna',     'Keller',      'Sorengo',    6942, 'Via Carona 21',     'anna.keller@example.ch',       '+41 79 667 88 45', 'AnKe'),
    ('Sig.',   'Paolo',    'Neri',        'Breganzona', 6932, 'Via Bosco 9',       'paolo.neri@example.ch',        '+41 79 744 12 30', 'PaNe'),
    ('Sig.ra', 'Sophie',   'Martin',      'Savosa',     6949, 'Via Riva 27',       'sophie.martin@example.ch',     '+41 79 455 66 19', 'SoMa'),
    ('Sig.',   'Roberto',  'Galli',       'Comano',     6944, 'Via al Mulino 5',   'roberto.galli@example.ch',     '+41 79 388 90 54', 'RoGa'),
    ('Sig.ra', 'Chiara',   'Vogel',       'Canobbio',   6949, 'Via Boscareccia 11','chiara.vogel@example.ch',      '+41 79 555 44 73', 'ChVo')
  ) AS v(title, first_name, last_name, city, zip, addr, email, mobile, code)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Client" c
    WHERE c.site_id = v_site_id AND c.code = v.code
  );

END $$;

COMMIT;

-- =============================================================================
-- 4. Verifiche di accettazione
-- ATTESO: total=35, business=25, individual=10, orphan=0
-- =============================================================================

-- 1) Conteggio totale clienti Benicchio = 35
SELECT COUNT(*) AS total_clients
FROM public."Client" c
JOIN public.sites s ON s.id = c.site_id AND s.subdomain = 'benicchio';
-- ATTESO: total_clients = 35

-- 2) Per tipo: BUSINESS = 25, INDIVIDUAL = 10
SELECT c."clientType", COUNT(*) AS cnt
FROM public."Client" c
JOIN public.sites s ON s.id = c.site_id AND s.subdomain = 'benicchio'
GROUP BY c."clientType"
ORDER BY c."clientType";
-- ATTESO: BUSINESS 25, INDIVIDUAL 10

-- 3) Nessuna riga con site_id diverso da Benicchio (controllo incrociato)
SELECT COUNT(*) AS orphan_count
FROM public."Client" c
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE c.site_id <> s.id;
-- ATTESO: orphan_count = 0

-- 4) INDIVIDUAL: code 4 caratteri; BUSINESS: businessName valorizzato
SELECT
  COUNT(*) FILTER (
    WHERE c."clientType" = 'INDIVIDUAL'
      AND (c.code IS NULL OR length(c.code) <> 4)
  ) AS invalid_individual_codes,
  COUNT(*) FILTER (
    WHERE c."clientType" = 'BUSINESS'
      AND (c."businessName" IS NULL OR btrim(c."businessName") = '')
  ) AS invalid_business_names
FROM public."Client" c
JOIN public.sites s ON s.id = c.site_id AND s.subdomain = 'benicchio';
-- ATTESO: entrambi = 0

-- 5) zipCode nel range ticinese plausibile, nessun NULL
SELECT
  COUNT(*) FILTER (WHERE c."zipCode" IS NULL) AS null_zip,
  COUNT(*) FILTER (WHERE c."zipCode" < 6500 OR c."zipCode" > 6999) AS out_of_range_zip
FROM public."Client" c
JOIN public.sites s ON s.id = c.site_id AND s.subdomain = 'benicchio';
-- ATTESO: null_zip = 0, out_of_range_zip = 0

-- 6) Le 5 città e i 10 comuni hanno contactPeople non vuoto
SELECT c."businessName",
       jsonb_array_length(c."contactPeople") AS referenti
FROM public."Client" c
JOIN public.sites s ON s.id = c.site_id AND s.subdomain = 'benicchio'
WHERE c."businessName" LIKE 'Città di %'
   OR c."businessName" LIKE 'Comune di %'
ORDER BY c."businessName";
-- ATTESO: 15 righe, referenti >= 1 ciascuna
