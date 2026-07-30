-- Migration: spazio tenant Benicchio SA (Full Data Manager)
-- Progetto: jzxffusiwtrvjwmpjztu (manager matris)
-- Modello: Santini SA (site_id 7ce3bca0-2293-4328-bee3-b8347c581b5b)
--
-- AVVERTENZA RLS (§13 prompt):
-- In produzione 41 tabelle hanno Row Level Security disattivata, tra cui Kanban,
-- KanbanColumn, Task, Client, User, inventory_items, inventory_categories.
-- Le righe create qui finiscono in tabelle potenzialmente esposte via chiave anon.
-- NON attivare RLS in questa migration — richiede branch dedicato con policy testate.
--
-- code_sequences: omessi volutamente. La RPC get_next_sequence_value() crea la riga
-- al primo utilizzo (INSERT ... ON CONFLICT DO UPDATE). I template OFFERTA/LAVORO/FATTURA
-- sono già configurati in site_settings.
--
-- Prezzi SellProduct: placeholder da confermare con il cliente.
-- Fornitori inventario: placeholder da sostituire con fornitori reali.

BEGIN;

DO $$
DECLARE
  v_org_id     uuid;
  v_site_id    uuid;
  v_rows       integer;
  -- KanbanColumn.identifier è UNIQUE globale in produzione (non per kanban).
  -- Prefisso obbligatorio per coesistere con Santini e gli altri tenant.
  v_col_prefix constant text := 'benicchio_';

  v_card_field_config constant jsonb := '{
    "small": {
      "date": true, "image": false, "notes": false, "value": true, "client": true,
      "pieces": true, "activity": true, "location": true, "suppliers": false,
      "objectName": true, "countryFlag": false, "projectCode": true, "productCategory": true
    },
    "normal": {
      "date": true, "image": true, "notes": true, "value": true, "client": true,
      "pieces": true, "activity": true, "location": true, "suppliers": true,
      "objectName": true, "countryFlag": true, "projectCode": true, "productCategory": true
    }
  }'::jsonb;

  v_theme_colors constant jsonb := '{
    "mode": "adaptive",
    "light": {
      "pageBackground": "#F2F7EC",
      "pageCard": "#E4EDDA",
      "sidebarBackground": "#D0E2C4",
      "sidebarCard": "#DCE8D2"
    },
    "dark": {
      "pageBackground": "#0E1410",
      "pageCard": "#1A2318",
      "sidebarBackground": "#121A14",
      "sidebarCard": "#243220"
    },
    "adaptive": {
      "pageBackground": "#EEF5E6",
      "pageCard": "#E2EDD8",
      "sidebarBackground": "#C8DCB8",
      "sidebarCard": "#D8E8CC"
    }
  }'::jsonb;

BEGIN
  -- ---------------------------------------------------------------------------
  -- 2. Organizzazione e site
  -- ---------------------------------------------------------------------------
  INSERT INTO public.organizations (id, name, code)
  VALUES (gen_random_uuid(), 'Benicchio', 'BEN')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE name = 'Benicchio';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organizzazione Benicchio non trovata dopo INSERT';
  END IF;

  INSERT INTO public.sites (
    id, organization_id, name, subdomain, description,
    custom_domain, logo, image
  )
  VALUES (
    gen_random_uuid(),
    v_org_id,
    'Benicchio SA',
    'benicchio',
    'Progettazione, costruzione e manutenzione giardini — dal 1891',
    NULL, NULL, NULL
  )
  ON CONFLICT (subdomain) DO NOTHING;

  SELECT id INTO v_site_id
  FROM public.sites
  WHERE subdomain = 'benicchio';

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site benicchio non trovato dopo INSERT';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. Moduli (21, come Santini)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.site_modules (site_id, module_name, is_enabled)
  SELECT v_site_id, m.module_name, true
  FROM unnest(ARRAY[
    'attendance', 'calendar', 'categories', 'clients', 'collaborators', 'dashboard',
    'dashboard-forecast', 'errortracking', 'factory', 'inventory', 'kanban', 'products',
    'projects', 'report-errors', 'report-inventory', 'report-projects', 'report-time',
    'reports', 'suppliers', 'timetracking', 'voice-input'
  ]::text[]) AS m(module_name)
  ON CONFLICT (site_id, module_name) DO UPDATE
    SET is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW();

  -- ---------------------------------------------------------------------------
  -- 4. Categorie Kanban
  -- ---------------------------------------------------------------------------
  INSERT INTO public."KanbanCategory" (
    name, identifier, icon, color, site_id, display_order, is_internal, internal_base_code
  )
  SELECT c.name, c.identifier, c.icon, c.color, v_site_id, c.display_order, c.is_internal, NULL
  FROM (VALUES
    (0, 'Vendita',        'ufficio',       'BadgeDollarSign',      '#F59E0B', false),
    (1, 'Progettazione',  'progettazione', 'PencilRuler',          '#6B7280', false),
    (2, 'Esecuzione',     'esecuzione',    'Shovel',               '#EC4899', false),
    (3, 'Fatturazione',   'fatturazione',  'ArrowRightFromLine',   '#10B981', false)
  ) AS c(display_order, name, identifier, icon, color, is_internal)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."KanbanCategory" kc
    WHERE kc.site_id = v_site_id AND kc.identifier = c.identifier
  );

  -- ---------------------------------------------------------------------------
  -- 5. Kanban (5 board)
  -- ---------------------------------------------------------------------------
  INSERT INTO public."Kanban" (
    title, identifier, color, site_id, category_id, icon,
    is_offer_kanban, is_work_kanban, is_production_kanban,
    show_category_colors, card_field_config
  )
  SELECT
    k.title,
    k.identifier,
    k.color,
    v_site_id,
    cat.id,
    k.icon,
    k.is_offer_kanban,
    k.is_work_kanban,
    k.is_production_kanban,
    k.show_category_colors,
    v_card_field_config
  FROM (VALUES
    ('Offerte',       '0_offerte',       '#f0900a', 'ufficio',       'Activity',   true,  false, false, false),
    ('Progettazione', '1_progettazione', '#1c4fa0', 'progettazione', 'FileText',   false, true,  false, true),
    ('Costruzione',   '2_costruzione',   '#2f7d4f', 'esecuzione',    'Hammer',     false, false, true,  false),
    ('Manutenzione',  '3_manutenzione',  '#7aa843', 'esecuzione',    'Leaf',       false, false, true,  false),
    ('Fatture OUT',   'fatture',         '#3f434b', 'fatturazione',  'MailCheck',  false, false, false, false)
  ) AS k(title, identifier, color, category_identifier, icon, is_offer_kanban, is_work_kanban, is_production_kanban, show_category_colors)
  JOIN public."KanbanCategory" cat
    ON cat.site_id = v_site_id AND cat.identifier = k.category_identifier
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Kanban" kb
    WHERE kb.site_id = v_site_id AND kb.identifier = k.identifier
  );

  -- ---------------------------------------------------------------------------
  -- 6a. Colonne Kanban
  -- ---------------------------------------------------------------------------

  -- Offerte (6 colonne)
  INSERT INTO public."KanbanColumn" (
    title, identifier, position, "kanbanId", icon, column_type, is_creation_column
  )
  SELECT c.title, v_col_prefix || c.identifier, c.position, k.id, c.icon, c.column_type, c.is_creation_column
  FROM public."Kanban" k
  CROSS JOIN (VALUES
    ('To do',       'to_do_0_offerte',          1, 'ArrowDownWideNarrow', 'normal',    false),
    ('Elaborazione','elaborazione_0_offerte',   2, 'Hourglass',           'normal',    true),
    ('Inviata',     'inviata_0_offerte',        3, 'Send',                'normal',    false),
    ('Trattativa',  'trattativa_0_offerte',     4, 'PackageOpen',         'normal',    false),
    ('Vinta',       'vinta_0_offerte',          5, 'BookCheck',           'won',       false),
    ('Persa',       'persa_0_offerte',          6, 'ArchiveX',            'lost',      false)
  ) AS c(title, identifier, position, icon, column_type, is_creation_column)
  WHERE k.site_id = v_site_id AND k.identifier = '0_offerte'
    AND NOT EXISTS (
      SELECT 1 FROM public."KanbanColumn" kc
      WHERE kc."kanbanId" = k.id AND kc.identifier = v_col_prefix || c.identifier
    );

  -- Progettazione (4 colonne, modello AVOR)
  INSERT INTO public."KanbanColumn" (
    title, identifier, position, "kanbanId", icon, column_type, is_creation_column
  )
  SELECT c.title, v_col_prefix || c.identifier, c.position, k.id, c.icon, c.column_type, c.is_creation_column
  FROM public."Kanban" k
  CROSS JOIN (VALUES
    ('To Do',       'to_do_1_progettazione',        1, 'ArrowDownWideNarrow', 'normal',     true),
    ('Rilievo',     'rilievo_1_progettazione',      2, 'Settings',            'normal',     false),
    ('Elaborazione','elaborazione_1_progettazione', 3, 'ArrowRightFromLine',  'normal',     false),
    ('Esecuzione',  'esecuzione_1_progettazione',   4, 'Shovel',              'production', false)
  ) AS c(title, identifier, position, icon, column_type, is_creation_column)
  WHERE k.site_id = v_site_id AND k.identifier = '1_progettazione'
    AND NOT EXISTS (
      SELECT 1 FROM public."KanbanColumn" kc
      WHERE kc."kanbanId" = k.id AND kc.identifier = v_col_prefix || c.identifier
    );

  -- Costruzione (8 colonne)
  INSERT INTO public."KanbanColumn" (
    title, identifier, position, "kanbanId", icon, column_type, is_creation_column
  )
  SELECT c.title, v_col_prefix || c.identifier, c.position, k.id, c.icon, c.column_type, c.is_creation_column
  FROM public."Kanban" k
  CROSS JOIN (VALUES
    ('To Do',              'to_do_2_costruzione',           1, 'ArrowDownWideNarrow', 'normal',    true),
    ('Sopralluogo',        'sopralluogo_2_costruzione',     2, 'MapPin',              'normal',    false),
    ('Preparazione terreno','preparazione_2_costruzione',   3, 'Tractor',             'normal',    false),
    ('Opere murarie',      'murarie_2_costruzione',         4, 'Brick',               'normal',    false),
    ('Irrigazione',        'irrigazione_2_costruzione',     5, 'Droplets',            'normal',    false),
    ('Piantumazione',      'piantumazione_2_costruzione',   6, 'Sprout',              'normal',    false),
    ('Finiture',           'finiture_2_costruzione',        7, 'Sparkles',            'normal',    false),
    ('Consegna',           'consegna_2_costruzione',        8, 'PackageCheck',        'invoicing', false)
  ) AS c(title, identifier, position, icon, column_type, is_creation_column)
  WHERE k.site_id = v_site_id AND k.identifier = '2_costruzione'
    AND NOT EXISTS (
      SELECT 1 FROM public."KanbanColumn" kc
      WHERE kc."kanbanId" = k.id AND kc.identifier = v_col_prefix || c.identifier
    );

  -- Manutenzione (5 colonne)
  INSERT INTO public."KanbanColumn" (
    title, identifier, position, "kanbanId", icon, column_type, is_creation_column
  )
  SELECT c.title, v_col_prefix || c.identifier, c.position, k.id, c.icon, c.column_type, c.is_creation_column
  FROM public."Kanban" k
  CROSS JOIN (VALUES
    ('To Do',      'to_do_3_manutenzione',        1, 'ArrowDownWideNarrow', 'normal',    true),
    ('Pianificata','pianificata_3_manutenzione',  2, 'CalendarClock',       'normal',    false),
    ('In corso',   'in_corso_3_manutenzione',     3, 'Loader',              'normal',    false),
    ('Controllo',  'controllo_3_manutenzione',    4, 'ClipboardCheck',      'normal',    false),
    ('Completata', 'completata_3_manutenzione',   5, 'CircleCheck',         'invoicing', false)
  ) AS c(title, identifier, position, icon, column_type, is_creation_column)
  WHERE k.site_id = v_site_id AND k.identifier = '3_manutenzione'
    AND NOT EXISTS (
      SELECT 1 FROM public."KanbanColumn" kc
      WHERE kc."kanbanId" = k.id AND kc.identifier = v_col_prefix || c.identifier
    );

  -- Fatture OUT (3 colonne, identica a Santini)
  INSERT INTO public."KanbanColumn" (
    title, identifier, position, "kanbanId", icon, column_type, is_creation_column
  )
  SELECT c.title, v_col_prefix || c.identifier, c.position, k.id, c.icon, c.column_type, c.is_creation_column
  FROM public."Kanban" k
  CROSS JOIN (VALUES
    ('To Do',  'to_do_fatture',   1, 'faLayerGroup',     'normal', true),
    ('Inviata','inviata_fatture', 2, 'faTruck',          'normal', false),
    ('Pagata', 'pagata_fatture',  3, 'faClipboardCheck', 'normal', false)
  ) AS c(title, identifier, position, icon, column_type, is_creation_column)
  WHERE k.site_id = v_site_id AND k.identifier = 'fatture'
    AND NOT EXISTS (
      SELECT 1 FROM public."KanbanColumn" kc
      WHERE kc."kanbanId" = k.id AND kc.identifier = v_col_prefix || c.identifier
    );

  -- ---------------------------------------------------------------------------
  -- 6b. Seconda passata — collegamenti di flusso Kanban
  -- ---------------------------------------------------------------------------
  UPDATE public."Kanban" k
  SET target_work_kanban_id = t.id
  FROM public."Kanban" t
  WHERE k.site_id = v_site_id
    AND t.site_id = v_site_id
    AND k.identifier = '0_offerte'
    AND t.identifier = '1_progettazione';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'UPDATE fallita: 0_offerte.target_work_kanban_id → 1_progettazione (0 righe)';
  END IF;

  UPDATE public."Kanban" k
  SET target_invoice_kanban_id = t.id
  FROM public."Kanban" t
  WHERE k.site_id = v_site_id
    AND t.site_id = v_site_id
    AND k.identifier = '2_costruzione'
    AND t.identifier = 'fatture';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'UPDATE fallita: 2_costruzione.target_invoice_kanban_id → fatture (0 righe)';
  END IF;

  UPDATE public."Kanban" k
  SET target_invoice_kanban_id = t.id
  FROM public."Kanban" t
  WHERE k.site_id = v_site_id
    AND t.site_id = v_site_id
    AND k.identifier = '3_manutenzione'
    AND t.identifier = 'fatture';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'UPDATE fallita: 3_manutenzione.target_invoice_kanban_id → fatture (0 righe)';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 7. Site settings
  -- ---------------------------------------------------------------------------
  INSERT INTO public.site_settings (site_id, setting_key, setting_value)
  VALUES
    (v_site_id, 'code_template_offerta', '{"template":"{{anno_corto}}-{{sequenza}}-{{stato}}","sequenceType":"OFFERTA","paddingDigits":3}'::jsonb),
    (v_site_id, 'code_template_lavoro',  '{"template":"{{anno_corto}}-{{sequenza}}","sequenceType":"LAVORO","paddingDigits":3}'::jsonb),
    (v_site_id, 'code_template_fattura', '{"template":"{{anno_corto}}-{{sequenza}}-{{stato}}","sequenceType":"FATTURA","paddingDigits":3}'::jsonb),
    (v_site_id, 'auto_archive',          '{"days":30,"enabled":false}'::jsonb),
    (v_site_id, 'command_deck_enabled',  'true'::jsonb),
    (v_site_id, 'support_bot_enabled',   'false'::jsonb),
    (v_site_id, 'theme_colors',          v_theme_colors)
  ON CONFLICT (site_id, setting_key) DO NOTHING;

  -- production_routing (seconda passata dinamica)
  INSERT INTO public.site_settings (site_id, setting_key, setting_value)
  SELECT
    v_site_id,
    'production_routing',
    jsonb_build_object(
      'Costruzione',  (SELECT id FROM public."Kanban" WHERE site_id = v_site_id AND identifier = '2_costruzione'),
      'Manutenzione', (SELECT id FROM public."Kanban" WHERE site_id = v_site_id AND identifier = '3_manutenzione')
    )
  ON CONFLICT (site_id, setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value,
        updated_at = NOW();

  -- ---------------------------------------------------------------------------
  -- 8. Prodotti vendibili (sellproduct_categories + SellProduct)
  -- Prezzi: placeholder — da confermare con Benicchio SA
  -- ---------------------------------------------------------------------------
  INSERT INTO public.sellproduct_categories (site_id, name, icon, color, sort_order)
  SELECT v_site_id, c.name, c.icon, c.color, c.sort_order
  FROM (VALUES
    (0, 'Progettazione',         'PencilRuler', '#6B7280'),
    (1, 'Opere da giardiniere',  'Shovel',      '#8B5E3C'),
    (2, 'Irrigazione',           'Droplets',    '#3B82F6'),
    (3, 'Verde e piantumazione', 'Sprout',      '#2f7d4f'),
    (4, 'Manutenzione',          'Leaf',        '#7aa843')
  ) AS c(sort_order, name, icon, color)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sellproduct_categories sc
    WHERE sc.site_id = v_site_id AND sc.name = c.name
  );

  INSERT INTO public."SellProduct" (
    site_id, name, category_id, unit, list_price, active, price_list, internal_code, description
  )
  SELECT v_site_id, p.name, sc.id, p.unit, p.list_price, true, true, p.internal_code,
         'Prezzo placeholder — da confermare con il cliente'
  FROM (VALUES
    -- Progettazione
    ('Progettazione',         'Rilievo e analisi del sito',     'pz',  450,  'BEN-PROG-001'),
    ('Progettazione',         'Progetto giardino privato',     'pz', 2800,  'BEN-PROG-002'),
    ('Progettazione',         'Piano di piantumazione',        'pz',  650,  'BEN-PROG-003'),
    ('Progettazione',         'Variante progettuale',          'pz',  350,  'BEN-PROG-004'),
    -- Opere da giardiniere
    ('Opere da giardiniere',  'Muretto a secco in pietra naturale', 'm2', 180, 'BEN-GIAR-001'),
    ('Opere da giardiniere',  'Pavimentazione in porfido posata',   'm2', 120, 'BEN-GIAR-002'),
    ('Opere da giardiniere',  'Cordolo di delimitazione',           'm',  45, 'BEN-GIAR-003'),
    ('Opere da giardiniere',  'Scavo e movimento terra',            'm3',  35, 'BEN-GIAR-004'),
    -- Irrigazione
    ('Irrigazione',           'Impianto di irrigazione automatico', 'pz', 4500, 'BEN-IRR-001'),
    ('Irrigazione',           'Estensione linea gocciolamento',     'm',     8, 'BEN-IRR-002'),
    ('Irrigazione',           'Programmatore e centralina',         'pz',  380, 'BEN-IRR-003'),
    -- Verde e piantumazione
    ('Verde e piantumazione', 'Prato in rotoli posato',             'm2',   18, 'BEN-VER-001'),
    ('Verde e piantumazione', 'Semina prato',                       'm2',   12, 'BEN-VER-002'),
    ('Verde e piantumazione', 'Siepe di lauroceraso piantata',      'm',    35, 'BEN-VER-003'),
    ('Verde e piantumazione', 'Messa a dimora alberatura',          'pz',  450, 'BEN-VER-004'),
    -- Manutenzione
    ('Manutenzione',          'Abbonamento manutenzione stagionale',  'pz', 1200, 'BEN-MAN-001'),
    ('Manutenzione',          'Sfalcio prato',                      'm2',  2.5, 'BEN-MAN-002'),
    ('Manutenzione',          'Potatura alberi ad alto fusto',      'pz',  280, 'BEN-MAN-003'),
    ('Manutenzione',          'Trattamento fitosanitario',          'pz',  150, 'BEN-MAN-004')
  ) AS p(category_name, name, unit, list_price, internal_code)
  JOIN public.sellproduct_categories sc
    ON sc.site_id = v_site_id AND sc.name = p.category_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public."SellProduct" sp
    WHERE sp.site_id = v_site_id AND sp.internal_code = p.internal_code
  );

  -- ---------------------------------------------------------------------------
  -- 9. Magazzino
  -- Fornitori: placeholder — da sostituire con fornitori reali
  -- ---------------------------------------------------------------------------
  INSERT INTO public.inventory_warehouses (site_id, name, code)
  SELECT v_site_id, w.name, w.code
  FROM (VALUES
    ('Magazzino Lamone', 'LAM'),
    ('Furgone 1',        'FUR1')
  ) AS w(name, code)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_warehouses iw
    WHERE iw.site_id = v_site_id AND iw.code = w.code
  );

  INSERT INTO public.inventory_suppliers (site_id, name, code)
  SELECT v_site_id, s.name, s.code
  FROM (VALUES
    ('Fornitore vivaistico',       'VIV'),
    ('Fornitore irrigazione',      'IRR'),
    ('Fornitore materiali inerti', 'INERT')
  ) AS s(name, code)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_suppliers sup
    WHERE sup.site_id = v_site_id AND sup.code = s.code
  );

  INSERT INTO public.inventory_categories (site_id, name, sort_order)
  SELECT v_site_id, c.name, c.sort_order
  FROM (VALUES
    (0, 'Sementi e terricci'),
    (1, 'Concimi e fitosanitari'),
    (2, 'Piante e arbusti'),
    (3, 'Irrigazione'),
    (4, 'Materiali inerti'),
    (5, 'Utensileria e ricambi'),
    (6, 'Dispositivi di protezione')
  ) AS c(sort_order, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_categories ic
    WHERE ic.site_id = v_site_id AND ic.name = c.name
  );

  INSERT INTO public.inventory_items (
    site_id, name, category_id, is_stocked, is_active
  )
  SELECT v_site_id, i.name, ic.id, true, true
  FROM (VALUES
    ('Sementi e terricci',        'Sementi prato universale'),
    ('Sementi e terricci',        'Terriccio universale'),
    ('Sementi e terricci',        'Substrato acidofile'),
    ('Sementi e terricci',        'Corteccia pacciamante'),
    ('Concimi e fitosanitari',    'Concime granulare prato'),
    ('Concimi e fitosanitari',    'Concime organico'),
    ('Concimi e fitosanitari',    'Antiparassitario fogliare'),
    ('Concimi e fitosanitari',    'Diserbante selettivo'),
    ('Piante e arbusti',          'Lauroceraso in vaso'),
    ('Piante e arbusti',          'Acero campestre'),
    ('Piante e arbusti',          'Graminacee ornamentali'),
    ('Irrigazione',               'Tubo PE 25 mm'),
    ('Irrigazione',               'Tubo gocciolante 16 mm'),
    ('Irrigazione',               'Irrigatore pop-up'),
    ('Irrigazione',               'Elettrovalvola 1"'),
    ('Irrigazione',               'Programmatore 6 zone'),
    ('Irrigazione',               'Raccorderia assortita'),
    ('Materiali inerti',          'Ghiaia lavata 8/16'),
    ('Materiali inerti',          'Sabbia di allettamento'),
    ('Materiali inerti',          'Pietra naturale a spacco'),
    ('Materiali inerti',          'Geotessuto antiradice'),
    ('Utensileria e ricambi',     'Filo nylon decespugliatore'),
    ('Utensileria e ricambi',     'Lama tosaerba'),
    ('Utensileria e ricambi',     'Olio miscela'),
    ('Utensileria e ricambi',     'Catena motosega'),
    ('Dispositivi di protezione', 'Guanti da lavoro'),
    ('Dispositivi di protezione', 'Occhiali protettivi'),
    ('Dispositivi di protezione', 'Cuffie antirumore')
  ) AS i(category_name, name)
  JOIN public.inventory_categories ic
    ON ic.site_id = v_site_id AND ic.name = i.category_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_items ii
    WHERE ii.site_id = v_site_id AND ii.name = i.name
  );

  INSERT INTO public.inventory_item_variants (
    item_id, site_id, unit_id, internal_code
  )
  SELECT ii.id, v_site_id, u.id, 'BEN-INV-' || replace(lower(regexp_replace(ii.name, '[^a-zA-Z0-9]+', '-', 'g')), '--', '-')
  FROM (VALUES
    ('Sementi prato universale',     'kg'),
    ('Terriccio universale',         'l'),
    ('Substrato acidofile',          'l'),
    ('Corteccia pacciamante',        'm3'),
    ('Concime granulare prato',      'kg'),
    ('Concime organico',             'kg'),
    ('Antiparassitario fogliare',    'l'),
    ('Diserbante selettivo',         'l'),
    ('Lauroceraso in vaso',          'pz'),
    ('Acero campestre',              'pz'),
    ('Graminacee ornamentali',       'pz'),
    ('Tubo PE 25 mm',                'm'),
    ('Tubo gocciolante 16 mm',       'm'),
    ('Irrigatore pop-up',            'pz'),
    ('Elettrovalvola 1"',            'pz'),
    ('Programmatore 6 zone',         'pz'),
    ('Raccorderia assortita',        'pz'),
    ('Ghiaia lavata 8/16',           'm3'),
    ('Sabbia di allettamento',       'm3'),
    ('Pietra naturale a spacco',     'm2'),
    ('Geotessuto antiradice',        'm2'),
    ('Filo nylon decespugliatore',    'm'),
    ('Lama tosaerba',                'pz'),
    ('Olio miscela',                 'l'),
    ('Catena motosega',              'pz'),
    ('Guanti da lavoro',             'pz'),
    ('Occhiali protettivi',          'pz'),
    ('Cuffie antirumore',            'pz')
  ) AS v(item_name, unit_code)
  JOIN public.inventory_items ii
    ON ii.site_id = v_site_id AND ii.name = v.item_name
  JOIN public.inventory_units u ON u.code = v.unit_code
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_item_variants iv
    WHERE iv.item_id = ii.id
  );

END $$;

COMMIT;

-- =============================================================================
-- 10. Accessi utente — scheletro (NON eseguire finché gli utenti non esistono)
-- Sostituire :user_id con l'UUID da auth.users
-- =============================================================================
/*
DO $$
DECLARE
  v_user_id uuid := :'user_id';
  v_site_id uuid;
BEGIN
  SELECT id INTO v_site_id FROM public.sites WHERE subdomain = 'benicchio';
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site benicchio non trovato';
  END IF;

  INSERT INTO public.user_sites (user_id, site_id)
  VALUES (v_user_id, v_site_id)
  ON CONFLICT (user_id, site_id) DO NOTHING;

  INSERT INTO public.user_organizations (user_id, organization_id)
  SELECT v_user_id, s.organization_id
  FROM public.sites s
  WHERE s.id = v_site_id
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  INSERT INTO public.user_module_permissions (user_id, site_id, module_name)
  SELECT v_user_id, v_site_id, m.module_name
  FROM unnest(ARRAY[
    'attendance', 'calendar', 'categories', 'clients', 'collaborators', 'dashboard',
    'dashboard-forecast', 'errortracking', 'factory', 'inventory', 'kanban', 'products',
    'projects', 'report-errors', 'report-inventory', 'report-projects', 'report-time',
    'reports', 'suppliers', 'timetracking', 'voice-input'
  ]::text[]) AS m(module_name)
  ON CONFLICT (user_id, site_id, module_name) DO NOTHING;

  INSERT INTO public.user_kanban_category_permissions (user_id, kanban_category_id)
  SELECT v_user_id, kc.id
  FROM public."KanbanCategory" kc
  WHERE kc.site_id = v_site_id
  ON CONFLICT (user_id, kanban_category_id) DO NOTHING;

  -- Roles: name è UNIQUE globalmente — usare nomi non già presenti o riusare ruoli globali (site_id NULL)
  INSERT INTO public."Roles" (name, site_id)
  VALUES
    ('Benicchio — Capo cantiere', v_site_id),
    ('Benicchio — Giardiniere',   v_site_id),
    ('Benicchio — Progettista',   v_site_id)
  ON CONFLICT (name) DO NOTHING;
END $$;
*/

-- =============================================================================
-- 11. Query di verifica accettazione
-- Eseguire dopo COMMIT. Risultati attesi indicati in commento.
-- =============================================================================

-- 1) Site esiste, 21 moduli attivi, 4 categorie, 5 Kanban
-- ATTESO: modules_enabled=21, categories=4, kanbans=5
SELECT
  s.subdomain,
  s.name,
  (SELECT COUNT(*) FROM public.site_modules sm
   WHERE sm.site_id = s.id AND sm.is_enabled = true) AS modules_enabled,
  (SELECT COUNT(*) FROM public."KanbanCategory" kc WHERE kc.site_id = s.id) AS categories,
  (SELECT COUNT(*) FROM public."Kanban" k WHERE k.site_id = s.id) AS kanbans
FROM public.sites s
WHERE s.subdomain = 'benicchio';

-- 2) Conteggio colonne per Kanban
-- ATTESO: 0_offerte=6, 1_progettazione=4, 2_costruzione=8, 3_manutenzione=5, fatture=3
SELECT k.identifier, k.title, COUNT(kc.id) AS column_count
FROM public."Kanban" k
JOIN public.sites s ON s.id = k.site_id AND s.subdomain = 'benicchio'
LEFT JOIN public."KanbanColumn" kc ON kc."kanbanId" = k.id
GROUP BY k.identifier, k.title
ORDER BY k.identifier;

-- 3) Esattamente una colonna is_creation_column = true per Kanban
-- ATTESO: creation_columns = 1 per ogni riga
SELECT k.identifier, COUNT(*) FILTER (WHERE kc.is_creation_column) AS creation_columns
FROM public."Kanban" k
JOIN public.sites s ON s.id = k.site_id AND s.subdomain = 'benicchio'
LEFT JOIN public."KanbanColumn" kc ON kc."kanbanId" = k.id
GROUP BY k.identifier
ORDER BY k.identifier;

-- 4) Collegamenti Kanban risolti (nessun target NULL dove atteso)
-- ATTESO: offerte→progettazione, costruzione→fatture, manutenzione→fatture (tutti non NULL)
SELECT
  k.identifier,
  k.target_work_kanban_id,
  tw.identifier   AS target_work_identifier,
  k.target_invoice_kanban_id,
  ti.identifier   AS target_invoice_identifier
FROM public."Kanban" k
JOIN public.sites s ON s.id = k.site_id AND s.subdomain = 'benicchio'
LEFT JOIN public."Kanban" tw ON tw.id = k.target_work_kanban_id
LEFT JOIN public."Kanban" ti ON ti.id = k.target_invoice_kanban_id
WHERE k.identifier IN ('0_offerte', '2_costruzione', '3_manutenzione')
ORDER BY k.identifier;

-- 5) Esattamente una colonna won e una lost in Offerte
-- ATTESO: won=1, lost=1
SELECT
  COUNT(*) FILTER (WHERE kc.column_type = 'won')  AS won_columns,
  COUNT(*) FILTER (WHERE kc.column_type = 'lost') AS lost_columns
FROM public."Kanban" k
JOIN public.sites s ON s.id = k.site_id AND s.subdomain = 'benicchio'
JOIN public."KanbanColumn" kc ON kc."kanbanId" = k.id
WHERE k.identifier = '0_offerte';

-- 6) production_routing con due chiavi valide
-- ATTESO: 2 chiavi, entrambi gli id esistono in Kanban per benicchio
SELECT
  ss.setting_value,
  (ss.setting_value ? 'Costruzione')  AS has_costruzione,
  (ss.setting_value ? 'Manutenzione') AS has_manutenzione,
  EXISTS (
    SELECT 1 FROM public."Kanban" k
    WHERE k.site_id = s.id
      AND k.id = (ss.setting_value->>'Costruzione')::integer
  ) AS costruzione_id_valid,
  EXISTS (
    SELECT 1 FROM public."Kanban" k
    WHERE k.site_id = s.id
      AND k.id = (ss.setting_value->>'Manutenzione')::integer
  ) AS manutenzione_id_valid
FROM public.site_settings ss
JOIN public.sites s ON s.id = ss.site_id AND s.subdomain = 'benicchio'
WHERE ss.setting_key = 'production_routing';

-- 7) Controllo incrociato site_id — nessuna riga orfana su altri site
-- ATTESO: orphan_count = 0 per ogni tabella
SELECT 'site_modules' AS tbl, COUNT(*) AS orphan_count
FROM public.site_modules sm
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE sm.site_id <> s.id
UNION ALL
SELECT 'KanbanCategory', COUNT(*)
FROM public."KanbanCategory" kc
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE kc.site_id <> s.id
UNION ALL
SELECT 'Kanban', COUNT(*)
FROM public."Kanban" k
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE k.site_id <> s.id
UNION ALL
SELECT 'sellproduct_categories', COUNT(*)
FROM public.sellproduct_categories sc
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE sc.site_id <> s.id
UNION ALL
SELECT 'SellProduct', COUNT(*)
FROM public."SellProduct" sp
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE sp.site_id <> s.id
UNION ALL
SELECT 'inventory_warehouses', COUNT(*)
FROM public.inventory_warehouses iw
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE iw.site_id <> s.id
UNION ALL
SELECT 'inventory_items', COUNT(*)
FROM public.inventory_items ii
JOIN public.sites s ON s.subdomain = 'benicchio'
WHERE ii.site_id <> s.id;

-- 8) Confronto strutturale categorie e Kanban: Benicchio vs Santini (7ce3bca0-2293-4328-bee3-b8347c581b5b)
-- ATTESO: affiancamento per verifica manuale della struttura
SELECT
  s.subdomain,
  kc.display_order,
  kc.name       AS category_name,
  kc.identifier AS category_identifier,
  k.title       AS kanban_title,
  k.identifier  AS kanban_identifier
FROM public.sites s
JOIN public."KanbanCategory" kc ON kc.site_id = s.id
LEFT JOIN public."Kanban" k ON k.category_id = kc.id
WHERE s.subdomain = 'benicchio'
   OR s.id = '7ce3bca0-2293-4328-bee3-b8347c581b5b'::uuid
ORDER BY s.subdomain, kc.display_order, k.identifier NULLS LAST;
