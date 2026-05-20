-- =====================================================================
-- Audit prodotti potenzialmente importati nel sito sbagliato
-- =====================================================================
-- Sintomo tipico: in un sito (es. Marco Bond) compaiono SellProduct
-- chiaramente appartenenti al catalogo di un altro sito (stesso
-- internal_code o stesso nome + categoria). Spesso conseguenza di un
-- import CSV eseguito mentre era selezionato il sito sbagliato.
--
-- Le sezioni 1-3 sono SOLO read-only e mostrano i candidati duplicati.
-- La sezione 4 contiene un esempio commentato di DELETE mirato: non
-- decommentare finche non hai verificato a mano l'elenco.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Censimento per sito (capisci dove si concentra il "rumore")
-- ---------------------------------------------------------------------
SELECT
    s.id           AS site_id,
    s.name         AS site_name,
    s.domain       AS site_domain,
    COUNT(sp.id)   AS total_products,
    COUNT(sp.internal_code) FILTER (WHERE sp.internal_code IS NOT NULL)
                   AS with_internal_code
FROM "public"."SellProduct" sp
JOIN "public"."Site" s ON s.id = sp.site_id
GROUP BY s.id, s.name, s.domain
ORDER BY total_products DESC;

-- ---------------------------------------------------------------------
-- 2. Duplicati cross-site per internal_code
--    Un internal_code che esiste su piu siti = sospetto forte di import
--    duplicato. Mostra in quale sito vive ogni copia.
-- ---------------------------------------------------------------------
WITH dup AS (
    SELECT internal_code
    FROM "public"."SellProduct"
    WHERE internal_code IS NOT NULL
      AND internal_code <> ''
    GROUP BY internal_code
    HAVING COUNT(DISTINCT site_id) > 1
)
SELECT
    sp.internal_code,
    sp.id           AS sell_product_id,
    sp.name,
    sp.subcategory,
    s.id            AS site_id,
    s.name          AS site_name,
    sp.created_at,
    sp.updated_at,
    (
        SELECT COUNT(*) FROM "public"."Task" t
        WHERE t."sellProductId" = sp.id
    ) AS linked_tasks,
    (
        SELECT COUNT(*) FROM "public"."File" f
        WHERE f."sellProductId" = sp.id
    ) AS linked_files
FROM "public"."SellProduct" sp
JOIN dup ON dup.internal_code = sp.internal_code
JOIN "public"."Site" s ON s.id = sp.site_id
ORDER BY sp.internal_code, sp.created_at;

-- ---------------------------------------------------------------------
-- 3. Duplicati cross-site per (name, category_id)
--    Fallback per i record privi di internal_code.
-- ---------------------------------------------------------------------
WITH dup AS (
    SELECT name, category_id
    FROM "public"."SellProduct"
    WHERE name IS NOT NULL
    GROUP BY name, category_id
    HAVING COUNT(DISTINCT site_id) > 1
)
SELECT
    sp.id           AS sell_product_id,
    sp.name,
    sc.name         AS category_name,
    sp.subcategory,
    s.id            AS site_id,
    s.name          AS site_name,
    sp.created_at,
    (
        SELECT COUNT(*) FROM "public"."Task" t
        WHERE t."sellProductId" = sp.id
    ) AS linked_tasks
FROM "public"."SellProduct" sp
JOIN dup
  ON dup.name = sp.name
 AND COALESCE(dup.category_id, -1) = COALESCE(sp.category_id, -1)
LEFT JOIN "public"."sellproduct_categories" sc ON sc.id = sp.category_id
JOIN "public"."Site" s ON s.id = sp.site_id
ORDER BY sp.name, sp.created_at;

-- ---------------------------------------------------------------------
-- 4. Pulizia mirata (ESEMPIO - resta commentata finche non hai validato)
--    Sostituisci :wrong_site_id con l'id del sito da ripulire (es. quello
--    di Marco Bond) e :reference_site_id con quello "vero" da cui copiare.
--    Cancella SOLO i prodotti del sito sbagliato che hanno una copia con
--    lo stesso internal_code nel sito di riferimento.
-- ---------------------------------------------------------------------
-- BEGIN;
--
-- WITH cleanup AS (
--     SELECT wrong.id
--     FROM "public"."SellProduct" wrong
--     JOIN "public"."SellProduct" ref
--       ON ref.internal_code = wrong.internal_code
--      AND ref.site_id = :reference_site_id
--     WHERE wrong.site_id = :wrong_site_id
--       AND wrong.internal_code IS NOT NULL
-- )
-- DELETE FROM "public"."SellProduct"
-- WHERE id IN (SELECT id FROM cleanup)
-- RETURNING id, name, internal_code, site_id;
--
-- ROLLBACK;  -- cambia in COMMIT solo dopo aver letto il RETURNING
