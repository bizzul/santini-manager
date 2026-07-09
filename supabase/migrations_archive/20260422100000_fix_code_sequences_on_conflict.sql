-- Fix per duplicate key error nella creazione dei task / offerte.
--
-- Contesto: la migration 20260110100000_add_internal_category_fields.sql ha
-- sostituito il vincolo UNIQUE classico di code_sequences con un indice unico
-- basato sull'espressione COALESCE(category_id, -1):
--
--   CREATE UNIQUE INDEX "code_sequences_unique"
--   ON "code_sequences" (site_id, sequence_type, year, COALESCE(category_id, -1));
--
-- PostgreSQL NON consente di usare ON CONFLICT (site_id, sequence_type, year)
-- (3 colonne) con un indice unico a 4 colonne basato su un'espressione: si
-- ottiene l'errore 42P10 ("there is no unique or exclusion constraint matching
-- the ON CONFLICT specification"). Di conseguenza la funzione
-- get_next_sequence_value falliva ad ogni chiamata, costringendo il codice ad
-- entrare nel fallback manuale (anch'esso basato su upsert con onConflict),
-- che a sua volta falliva, generando codici task duplicati e violazioni del
-- vincolo Task_site_unique_code_key.
--
-- Soluzione:
-- 1. Aggiungere un indice UNIQUE PARZIALE su (site_id, sequence_type, year)
--    valido quando category_id IS NULL: questo è ciò di cui ha bisogno
--    ON CONFLICT per i codici "standard" (OFFERTA / LAVORO / FATTURA).
-- 2. Riscrivere get_next_sequence_value usando l'indice parziale corretto.

-- Step 1: Indice unico parziale per i codici standard (senza category_id).
--         L'indice esistente "code_sequences_unique" su 4 colonne resta a
--         tutela dei codici per categorie interne.
CREATE UNIQUE INDEX IF NOT EXISTS "code_sequences_no_category_unique"
ON "public"."code_sequences" ("site_id", "sequence_type", "year")
WHERE "category_id" IS NULL;

-- Step 2: Riscrivere la funzione RPC per usare l'indice parziale.
--         La clausola WHERE in ON CONFLICT deve combaciare ESATTAMENTE con
--         quella dell'indice parziale.
CREATE OR REPLACE FUNCTION public.get_next_sequence_value(
    p_site_id UUID,
    p_sequence_type TEXT,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_next_value INTEGER;
BEGIN
    INSERT INTO "public"."code_sequences" (site_id, sequence_type, year, current_value, category_id)
    VALUES (p_site_id, p_sequence_type, p_year, 1, NULL)
    ON CONFLICT (site_id, sequence_type, year) WHERE category_id IS NULL
    DO UPDATE SET
        current_value = code_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO v_next_value;

    RETURN v_next_value;
END;
$$ LANGUAGE plpgsql;
