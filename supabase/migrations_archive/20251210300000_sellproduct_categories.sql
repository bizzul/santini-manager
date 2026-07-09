-- Migration: Tabella per categorie SellProduct
-- 
-- Questa tabella permette di gestire le categorie dei prodotti vendibili
-- in modo centralizzato per ogni site.

-- =====================================================
-- Step 1: Creare tabella sellproduct_categories
-- =====================================================

CREATE TABLE IF NOT EXISTS "public"."sellproduct_categories" (
    "id" SERIAL PRIMARY KEY,
    "site_id" UUID NOT NULL REFERENCES "public"."Site"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "sellproduct_categories_site_name_unique" UNIQUE ("site_id", "name")
);

ALTER TABLE "public"."sellproduct_categories" OWNER TO "postgres";

-- Indici per performance
CREATE INDEX IF NOT EXISTS "idx_sellproduct_categories_site_id" 
    ON "public"."sellproduct_categories" ("site_id");

CREATE INDEX IF NOT EXISTS "idx_sellproduct_categories_name" 
    ON "public"."sellproduct_categories" ("name");

-- =====================================================
-- Step 2: Enable RLS
-- =====================================================

ALTER TABLE "public"."sellproduct_categories" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their site categories" ON "public"."sellproduct_categories"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."user_sites" us
            WHERE us.site_id = sellproduct_categories.site_id 
            AND us.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage categories" ON "public"."sellproduct_categories"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- Step 3: Aggiungere riferimento in SellProduct
-- =====================================================

ALTER TABLE "public"."SellProduct" 
    ADD COLUMN IF NOT EXISTS "category_id" INTEGER REFERENCES "public"."sellproduct_categories"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_sellproduct_category_id" 
    ON "public"."SellProduct" ("category_id");

-- =====================================================
-- Step 4: Commenti per documentazione
-- =====================================================

COMMENT ON TABLE "public"."sellproduct_categories" IS 'Categorie per i prodotti vendibili (SellProduct), per site';
COMMENT ON COLUMN "public"."sellproduct_categories"."name" IS 'Nome della categoria (es: Arredamento, Porte, Serramenti)';
COMMENT ON COLUMN "public"."sellproduct_categories"."color" IS 'Colore per visualizzazione UI';
COMMENT ON COLUMN "public"."SellProduct"."category_id" IS 'Riferimento alla categoria del prodotto';
