-- Migration: Sistema Routing Produzione e Fatturazione
-- 
-- Questo sistema permette di:
-- 1. Marcare una kanban come "kanban lavori" o "kanban produzione"
-- 2. Definire colonne speciali (production/invoicing) che attivano spostamenti automatici
-- 3. Configurare routing basato su categoria prodotto

-- =====================================================
-- Step 1: Aggiornare constraint column_type
-- =====================================================

-- Rimuovi il vecchio constraint
ALTER TABLE "public"."KanbanColumn"
    DROP CONSTRAINT IF EXISTS "kanbancolumn_column_type_check";

-- Aggiungi il nuovo constraint con production e invoicing
ALTER TABLE "public"."KanbanColumn"
    ADD CONSTRAINT "kanbancolumn_column_type_check" 
    CHECK (column_type IN ('normal', 'won', 'lost', 'production', 'invoicing'));

-- =====================================================
-- Step 2: Aggiungere flag is_work_kanban
-- =====================================================

ALTER TABLE "public"."Kanban" 
    ADD COLUMN IF NOT EXISTS "is_work_kanban" BOOLEAN DEFAULT false;

-- =====================================================
-- Step 3: Aggiungere flag is_production_kanban
-- =====================================================

ALTER TABLE "public"."Kanban" 
    ADD COLUMN IF NOT EXISTS "is_production_kanban" BOOLEAN DEFAULT false;

-- =====================================================
-- Step 4: Aggiungere target_invoice_kanban_id
-- =====================================================

ALTER TABLE "public"."Kanban" 
    ADD COLUMN IF NOT EXISTS "target_invoice_kanban_id" INTEGER REFERENCES "public"."Kanban"("id") ON DELETE SET NULL;

-- =====================================================
-- Step 5: Commenti per documentazione
-- =====================================================

COMMENT ON COLUMN "public"."Kanban"."is_work_kanban" IS 'Se true, questa kanban è per gestione lavori con routing verso produzione';
COMMENT ON COLUMN "public"."Kanban"."is_production_kanban" IS 'Se true, questa kanban è per produzione con routing verso fatturazione';
COMMENT ON COLUMN "public"."Kanban"."target_invoice_kanban_id" IS 'Kanban destinazione dove spostare task quando completata produzione';
COMMENT ON CONSTRAINT "kanbancolumn_column_type_check" ON "public"."KanbanColumn" IS 'Tipi colonna: normal, won (vinta), lost (persa), production (routing produzione), invoicing (routing fatturazione)';
