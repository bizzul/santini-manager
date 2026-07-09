-- Migration: Sistema Offerte con duplicazione automatica e template codici
-- 
-- Questo sistema permette di:
-- 1. Marcare una kanban come "kanban offerte"
-- 2. Definire colonne speciali (vinta/persa) che attivano azioni automatiche
-- 3. Gestire template configurabili per i codici task
-- 4. Tracciare relazioni parent-child tra task

-- =====================================================
-- Step 1: Creare tabella site_settings per configurazioni
-- =====================================================

CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" SERIAL PRIMARY KEY,
    "site_id" UUID NOT NULL REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    "setting_key" TEXT NOT NULL,
    "setting_value" JSONB NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "site_settings_site_key_unique" UNIQUE ("site_id", "setting_key")
);

ALTER TABLE "public"."site_settings" OWNER TO "postgres";

-- Indici per performance
CREATE INDEX IF NOT EXISTS "idx_site_settings_site_id" ON "public"."site_settings" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_site_settings_key" ON "public"."site_settings" ("setting_key");

-- Enable RLS
ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their site settings" ON "public"."site_settings"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."user_sites" us
            WHERE us.site_id = site_settings.site_id 
            AND us.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage site settings" ON "public"."site_settings"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- Step 2: Creare tabella code_sequences per contatori
-- =====================================================

CREATE TABLE IF NOT EXISTS "public"."code_sequences" (
    "id" SERIAL PRIMARY KEY,
    "site_id" UUID NOT NULL REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    "sequence_type" TEXT NOT NULL,  -- es: "OFFERTA", "LAVORO", "FATTURA"
    "year" INTEGER NOT NULL,
    "current_value" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT "code_sequences_unique" UNIQUE ("site_id", "sequence_type", "year")
);

ALTER TABLE "public"."code_sequences" OWNER TO "postgres";

-- Indici per performance
CREATE INDEX IF NOT EXISTS "idx_code_sequences_site_type_year" 
    ON "public"."code_sequences" ("site_id", "sequence_type", "year");

-- Enable RLS
ALTER TABLE "public"."code_sequences" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their code sequences" ON "public"."code_sequences"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."user_sites" us
            WHERE us.site_id = code_sequences.site_id 
            AND us.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage code sequences" ON "public"."code_sequences"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."user_sites" us
            WHERE us.site_id = code_sequences.site_id 
            AND us.user_id = auth.uid()
        )
    );

-- Funzione per ottenere il prossimo valore della sequenza (atomica)
CREATE OR REPLACE FUNCTION get_next_sequence_value(
    p_site_id UUID,
    p_sequence_type TEXT,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_next_value INTEGER;
BEGIN
    -- Insert or update the sequence, returning the new value
    INSERT INTO "public"."code_sequences" (site_id, sequence_type, year, current_value)
    VALUES (p_site_id, p_sequence_type, p_year, 1)
    ON CONFLICT (site_id, sequence_type, year)
    DO UPDATE SET 
        current_value = code_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO v_next_value;
    
    RETURN v_next_value;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Step 3: Modificare tabella Kanban
-- =====================================================

-- Aggiungere flag per kanban offerte
ALTER TABLE "public"."Kanban" 
    ADD COLUMN IF NOT EXISTS "is_offer_kanban" BOOLEAN DEFAULT false;

-- Aggiungere riferimento alla kanban destinazione per lavori
ALTER TABLE "public"."Kanban" 
    ADD COLUMN IF NOT EXISTS "target_work_kanban_id" INTEGER REFERENCES "public"."Kanban"("id") ON DELETE SET NULL;

-- =====================================================
-- Step 4: Modificare tabella KanbanColumn
-- =====================================================

-- Aggiungere tipo colonna per azioni speciali
-- normal = colonna standard
-- won = colonna "vinta" - attiva duplicazione in kanban lavori
-- lost = colonna "persa" - task diventa small_red
ALTER TABLE "public"."KanbanColumn" 
    ADD COLUMN IF NOT EXISTS "column_type" TEXT DEFAULT 'normal';

-- Constraint per valori validi
ALTER TABLE "public"."KanbanColumn"
    ADD CONSTRAINT "kanbancolumn_column_type_check" 
    CHECK (column_type IN ('normal', 'won', 'lost'));

-- =====================================================
-- Step 5: Modificare tabella Task
-- =====================================================

-- Riferimento al task padre (per relazione offerta -> lavoro)
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "parent_task_id" INTEGER REFERENCES "public"."Task"("id") ON DELETE SET NULL;

-- Tipo di task
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "task_type" TEXT DEFAULT 'LAVORO';

-- Modalità di visualizzazione
-- normal = visualizzazione standard
-- small_green = card piccola verde (offerta vinta)
-- small_red = card piccola rossa (offerta persa)
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "display_mode" TEXT DEFAULT 'normal';

-- Data di auto-archiviazione
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "auto_archive_at" TIMESTAMP WITHOUT TIME ZONE;

-- Indici per nuovi campi
CREATE INDEX IF NOT EXISTS "idx_task_parent_task_id" ON "public"."Task" ("parent_task_id");
CREATE INDEX IF NOT EXISTS "idx_task_task_type" ON "public"."Task" ("task_type");
CREATE INDEX IF NOT EXISTS "idx_task_display_mode" ON "public"."Task" ("display_mode");
CREATE INDEX IF NOT EXISTS "idx_task_auto_archive_at" ON "public"."Task" ("auto_archive_at");

-- =====================================================
-- Step 6: Inserire impostazioni di default per i template
-- =====================================================

-- Nota: Questi verranno inseriti per ogni site quando configura i template
-- Template di default per offerte: {{anno_corto}}-OFF-{{sequenza}}
-- Template di default per lavori: {{anno_corto}}-{{sequenza}}

-- =====================================================
-- Step 7: Commenti per documentazione
-- =====================================================

COMMENT ON TABLE "public"."site_settings" IS 'Configurazioni per site, inclusi template codici e impostazioni auto-archiviazione';
COMMENT ON TABLE "public"."code_sequences" IS 'Contatori incrementali per generazione codici task';
COMMENT ON COLUMN "public"."Kanban"."is_offer_kanban" IS 'Se true, questa kanban è per gestione offerte con logica speciale';
COMMENT ON COLUMN "public"."Kanban"."target_work_kanban_id" IS 'Kanban destinazione dove creare task quando offerta vinta';
COMMENT ON COLUMN "public"."KanbanColumn"."column_type" IS 'Tipo colonna: normal, won (vinta), lost (persa)';
COMMENT ON COLUMN "public"."Task"."parent_task_id" IS 'Riferimento al task padre (es. offerta che ha generato questo lavoro)';
COMMENT ON COLUMN "public"."Task"."task_type" IS 'Tipo task: OFFERTA, LAVORO, FATTURA, etc.';
COMMENT ON COLUMN "public"."Task"."display_mode" IS 'Modalità visualizzazione: normal, small_green, small_red';
COMMENT ON COLUMN "public"."Task"."auto_archive_at" IS 'Data/ora per auto-archiviazione task';
