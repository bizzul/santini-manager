-- Migration: Importa categorie esistenti da SellProduct.name a sellproduct_categories
-- 
-- Questa migration:
-- 1. Estrae i valori unici di 'name' dalla tabella SellProduct
-- 2. Li inserisce nella tabella sellproduct_categories
-- 3. Aggiorna il campo category_id in SellProduct per linkare alla nuova categoria

-- =====================================================
-- Step 1: Inserisci categorie uniche nella nuova tabella
-- =====================================================

INSERT INTO "public"."sellproduct_categories" ("site_id", "name", "created_at", "updated_at")
SELECT DISTINCT 
    sp.site_id,
    sp.name,
    NOW(),
    NOW()
FROM "public"."SellProduct" sp
WHERE sp.name IS NOT NULL 
  AND sp.name != ''
  AND sp.site_id IS NOT NULL
ON CONFLICT ("site_id", "name") DO NOTHING;

-- =====================================================
-- Step 2: Aggiorna category_id nei SellProduct esistenti
-- =====================================================

UPDATE "public"."SellProduct" sp
SET category_id = sc.id
FROM "public"."sellproduct_categories" sc
WHERE sp.site_id = sc.site_id
  AND sp.name = sc.name
  AND sp.category_id IS NULL;

-- =====================================================
-- Verifica (opzionale - può essere rimosso)
-- =====================================================

-- Per verificare i risultati, eseguire:
-- SELECT COUNT(*) as total_categories FROM sellproduct_categories;
-- SELECT COUNT(*) as products_with_category FROM "SellProduct" WHERE category_id IS NOT NULL;
