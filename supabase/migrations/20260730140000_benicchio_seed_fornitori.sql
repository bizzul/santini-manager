-- Migration: fornitori demo Benicchio SA (Supplier + inventory_suppliers)
-- Progetto: jzxffusiwtrvjwmpjztu (Full Data Manager)
-- Prerequisito: site benicchio (20260730100000_site_benicchio.sql)
--
-- Supplier_category: al momento nessuna categoria fornitore per Benicchio → supplier_category_id NULL.
--
-- NOTA SICUREZZA: Supplier e inventory_suppliers hanno RLS disattivata. Solo dati demo
-- (salvo Agrar Shop Ticino e Otto Hauenstein, dati pubblici). Nessun listino riservato.
--
-- Sostituisce i 3 fornitori placeholder del seed magazzino (VIV/IRR/INERT).

BEGIN;

DO $$
DECLARE
  v_site_id uuid;
BEGIN
  SELECT id INTO v_site_id
  FROM public.sites
  WHERE subdomain = 'benicchio';

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Site benicchio non trovato. Applicare prima 20260730100000_site_benicchio.sql';
  END IF;

  -- Rimuove i placeholder generici del seed iniziale magazzino
  DELETE FROM public.inventory_suppliers
  WHERE site_id = v_site_id
    AND name IN (
      'Fornitore vivaistico',
      'Fornitore irrigazione',
      'Fornitore materiali inerti'
    );

  -- ---------------------------------------------------------------------------
  -- Supplier (modulo prodotti/offerte)
  -- ---------------------------------------------------------------------------
  INSERT INTO public."Supplier" (
    name, short_name, description, location, cap, address,
    website, email, phone, contact, site_id, supplier_category_id
  )
  SELECT
    v.name,
    v.short_name,
    v.descr,
    v.location,
    v.cap,
    v.addr,
    v.website,
    v.email,
    v.phone,
    v.contact,
    v_site_id,
    NULL
  FROM (VALUES
    (
      'Agrar Shop Ticino',
      'AgrarShop',
      'Macchine da giardino, attrezzatura, ferramenta e irrigazione',
      'S. Antonino', 6592,
      'Via del Tiglio 12',
      'https://www.agrarshopticino.ch',
      NULL, NULL, NULL
    ),
    (
      'Otto Hauenstein Sementi SA',
      'Hauenstein',
      'Sementi per tappeti erbosi, concimi e inverdimenti',
      'S. Antonino', 6592,
      'Via Morobbi 2',
      'https://www.hauenstein.ch',
      NULL, NULL, NULL
    ),
    (
      'Vivaio del Ceresio',
      'VivaioCeresio',
      'Piante, arbusti e alberature ornamentali',
      'Lugano', 6900,
      'Via Cantonale 88',
      'https://vivaio-ceresio.example.ch',
      'info@vivaio-ceresio.example.ch',
      '+41 91 555 10 01',
      'Dott. Luca Bianchi'
    ),
    (
      'Garden Center Piano di Magadino',
      'GardenMagadino',
      'Piante ornamentali e fioriture stagionali',
      'Cadenazzo', 6593,
      'Via San Gottardo 120',
      'https://garden-magadino.example.ch',
      'ordini@garden-magadino.example.ch',
      '+41 91 555 10 02',
      'Sig.ra Monica Ferrini'
    ),
    (
      'Ticino Irrigazione Sagl',
      'TicinoIrrig',
      'Impianti e componenti per irrigazione',
      'Bioggio', 6934,
      'Via Industria 14',
      'https://ticino-irrigazione.example.ch',
      'info@ticino-irrigazione.example.ch',
      '+41 91 555 10 03',
      'Ing. Stefano Marchetti'
    ),
    (
      'Inerti Riviera SA',
      'InertiRiviera',
      'Ghiaia, sabbia e pietra naturale',
      'Biasca', 6710,
      'Via Stazione 22',
      'https://inerti-riviera.example.ch',
      'vendite@inerti-riviera.example.ch',
      '+41 91 555 10 04',
      'Sig. Andrea Cavadini'
    ),
    (
      'Verdegarden Forniture',
      'Verdegarden',
      'Terricci, corteccia e substrati',
      'Losone', 6616,
      'Via San Gottardo 62',
      'https://verdegarden.example.ch',
      'info@verdegarden.example.ch',
      '+41 91 555 10 05',
      'Sig.ra Giulia Bernasconi'
    ),
    (
      'Agrichimica Ticino Sagl',
      'AgrichimTI',
      'Concimi, fitosanitari e diserbanti',
      'S. Antonino', 6592,
      'Via Morobbi 18',
      'https://agrichimica-ti.example.ch',
      'ordini@agrichimica-ti.example.ch',
      '+41 91 555 10 06',
      'Dott. Paolo Neri'
    ),
    (
      'Ferramenta Tre Valli SA',
      'Ferr3Valli',
      'Utensileria, DPI e minuteria',
      'Biasca', 6710,
      'Via Lucomagno 5',
      'https://ferramenta-3valli.example.ch',
      'info@ferramenta-3valli.example.ch',
      '+41 91 555 10 07',
      'Sig. Matteo Colombo'
    ),
    (
      'Vivai Malcantone',
      'VivaiMalc',
      'Siepi, sempreverdi e piante da frutto',
      'Caslano', 6987,
      'Via Cantonale 42',
      'https://vivai-malcantone.example.ch',
      'info@vivai-malcantone.example.ch',
      '+41 91 555 10 08',
      'Sig.ra Laura Giani'
    ),
    (
      'Pietra & Giardino SA',
      'PietraGiard',
      'Pietra a spacco, cordoli e arredo esterno',
      'Mendrisio', 6850,
      'Via Luigi Cagliero 5',
      'https://pietra-giardino.example.ch',
      'vendite@pietra-giardino.example.ch',
      '+41 91 555 10 09',
      'Ing. Davide Solari'
    ),
    (
      'Motoagricola Sopraceneri',
      'MotoSopra',
      'Ricambi e assistenza macchine da giardino',
      'Gordola', 6596,
      'Via Cantonale 112',
      'https://motoagricola-sopra.example.ch',
      'ricambi@motoagricola-sopra.example.ch',
      '+41 91 555 10 10',
      'Sig. Roberto Galli'
    )
  ) AS v(name, short_name, descr, location, cap, addr, website, email, phone, contact)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Supplier" s
    WHERE s.site_id = v_site_id AND s.name = v.name
  );

  -- ---------------------------------------------------------------------------
  -- inventory_suppliers (modulo magazzino) — stessi nomi, code = lower(short_name)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.inventory_suppliers (
    id, site_id, name, short_name, code, notes,
    address, location, cap, phone, email, website, contact, supplier_category_id
  )
  SELECT
    gen_random_uuid(),
    v_site_id,
    v.name,
    v.short_name,
    lower(v.short_name),
    v.descr,
    v.addr,
    v.location,
    v.cap,
    v.phone,
    v.email,
    v.website,
    v.contact,
    NULL
  FROM (VALUES
    (
      'Agrar Shop Ticino',
      'AgrarShop',
      'Macchine da giardino, attrezzatura, ferramenta e irrigazione',
      'S. Antonino', 6592,
      'Via del Tiglio 12',
      'https://www.agrarshopticino.ch',
      NULL, NULL, NULL
    ),
    (
      'Otto Hauenstein Sementi SA',
      'Hauenstein',
      'Sementi per tappeti erbosi, concimi e inverdimenti',
      'S. Antonino', 6592,
      'Via Morobbi 2',
      'https://www.hauenstein.ch',
      NULL, NULL, NULL
    ),
    (
      'Vivaio del Ceresio',
      'VivaioCeresio',
      'Piante, arbusti e alberature ornamentali',
      'Lugano', 6900,
      'Via Cantonale 88',
      'https://vivaio-ceresio.example.ch',
      'info@vivaio-ceresio.example.ch',
      '+41 91 555 10 01',
      'Dott. Luca Bianchi'
    ),
    (
      'Garden Center Piano di Magadino',
      'GardenMagadino',
      'Piante ornamentali e fioriture stagionali',
      'Cadenazzo', 6593,
      'Via San Gottardo 120',
      'https://garden-magadino.example.ch',
      'ordini@garden-magadino.example.ch',
      '+41 91 555 10 02',
      'Sig.ra Monica Ferrini'
    ),
    (
      'Ticino Irrigazione Sagl',
      'TicinoIrrig',
      'Impianti e componenti per irrigazione',
      'Bioggio', 6934,
      'Via Industria 14',
      'https://ticino-irrigazione.example.ch',
      'info@ticino-irrigazione.example.ch',
      '+41 91 555 10 03',
      'Ing. Stefano Marchetti'
    ),
    (
      'Inerti Riviera SA',
      'InertiRiviera',
      'Ghiaia, sabbia e pietra naturale',
      'Biasca', 6710,
      'Via Stazione 22',
      'https://inerti-riviera.example.ch',
      'vendite@inerti-riviera.example.ch',
      '+41 91 555 10 04',
      'Sig. Andrea Cavadini'
    ),
    (
      'Verdegarden Forniture',
      'Verdegarden',
      'Terricci, corteccia e substrati',
      'Losone', 6616,
      'Via San Gottardo 62',
      'https://verdegarden.example.ch',
      'info@verdegarden.example.ch',
      '+41 91 555 10 05',
      'Sig.ra Giulia Bernasconi'
    ),
    (
      'Agrichimica Ticino Sagl',
      'AgrichimTI',
      'Concimi, fitosanitari e diserbanti',
      'S. Antonino', 6592,
      'Via Morobbi 18',
      'https://agrichimica-ti.example.ch',
      'ordini@agrichimica-ti.example.ch',
      '+41 91 555 10 06',
      'Dott. Paolo Neri'
    ),
    (
      'Ferramenta Tre Valli SA',
      'Ferr3Valli',
      'Utensileria, DPI e minuteria',
      'Biasca', 6710,
      'Via Lucomagno 5',
      'https://ferramenta-3valli.example.ch',
      'info@ferramenta-3valli.example.ch',
      '+41 91 555 10 07',
      'Sig. Matteo Colombo'
    ),
    (
      'Vivai Malcantone',
      'VivaiMalc',
      'Siepi, sempreverdi e piante da frutto',
      'Caslano', 6987,
      'Via Cantonale 42',
      'https://vivai-malcantone.example.ch',
      'info@vivai-malcantone.example.ch',
      '+41 91 555 10 08',
      'Sig.ra Laura Giani'
    ),
    (
      'Pietra & Giardino SA',
      'PietraGiard',
      'Pietra a spacco, cordoli e arredo esterno',
      'Mendrisio', 6850,
      'Via Luigi Cagliero 5',
      'https://pietra-giardino.example.ch',
      'vendite@pietra-giardino.example.ch',
      '+41 91 555 10 09',
      'Ing. Davide Solari'
    ),
    (
      'Motoagricola Sopraceneri',
      'MotoSopra',
      'Ricambi e assistenza macchine da giardino',
      'Gordola', 6596,
      'Via Cantonale 112',
      'https://motoagricola-sopra.example.ch',
      'ricambi@motoagricola-sopra.example.ch',
      '+41 91 555 10 10',
      'Sig. Roberto Galli'
    )
  ) AS v(name, short_name, descr, location, cap, addr, website, email, phone, contact)
  ON CONFLICT (site_id, name) DO UPDATE SET
    short_name       = EXCLUDED.short_name,
    code             = EXCLUDED.code,
    notes            = EXCLUDED.notes,
    address          = EXCLUDED.address,
    location         = EXCLUDED.location,
    cap              = EXCLUDED.cap,
    phone            = EXCLUDED.phone,
    email            = EXCLUDED.email,
    website          = EXCLUDED.website,
    contact          = EXCLUDED.contact,
    updated_at       = NOW();

END $$;

COMMIT;

-- =============================================================================
-- 4. Verifiche di accettazione
-- =============================================================================

-- 1) Conteggio: 12 fornitori per tabella
SELECT 'Supplier' AS tbl, COUNT(*) AS cnt
FROM public."Supplier" s
JOIN public.sites st ON st.id = s.site_id AND st.subdomain = 'benicchio'
UNION ALL
SELECT 'inventory_suppliers', COUNT(*)
FROM public.inventory_suppliers inv
JOIN public.sites st ON st.id = inv.site_id AND st.subdomain = 'benicchio';
-- ATTESO: entrambi cnt = 12

-- 2) I 12 name coincidono tra le due tabelle
SELECT COUNT(*) AS matched_names
FROM public."Supplier" s
JOIN public.sites st ON st.id = s.site_id AND st.subdomain = 'benicchio'
JOIN public.inventory_suppliers inv
  ON inv.site_id = s.site_id AND inv.name = s.name;
-- ATTESO: matched_names = 12

-- 3) Nessun site_id diverso da Benicchio
SELECT COUNT(*) AS orphan_supplier
FROM public."Supplier" s
JOIN public.sites st ON st.subdomain = 'benicchio'
WHERE s.site_id <> st.id
UNION ALL
SELECT COUNT(*)
FROM public.inventory_suppliers inv
JOIN public.sites st ON st.subdomain = 'benicchio'
WHERE inv.site_id <> st.id;
-- ATTESO: entrambi = 0

-- 4) Nessun description vuoto in Supplier
SELECT COUNT(*) AS empty_description
FROM public."Supplier" s
JOIN public.sites st ON st.id = s.site_id AND st.subdomain = 'benicchio'
WHERE s.description IS NULL OR btrim(s.description::text) = '';
-- ATTESO: empty_description = 0

-- 5) Fornitori reali con indirizzi corretti
SELECT s.name, s.location, s.cap, s.address, s.website
FROM public."Supplier" s
JOIN public.sites st ON st.id = s.site_id AND st.subdomain = 'benicchio'
WHERE s.name IN ('Agrar Shop Ticino', 'Otto Hauenstein Sementi SA')
ORDER BY s.name;
-- ATTESO: S. Antonino 6592, Via del Tiglio 12 / Via Morobbi 2

-- 6) Recapiti: demo con phone o email; reali possono avere entrambi NULL
SELECT s.name, s.phone, s.email, s.contact
FROM public."Supplier" s
JOIN public.sites st ON st.id = s.site_id AND st.subdomain = 'benicchio'
ORDER BY s.name;
