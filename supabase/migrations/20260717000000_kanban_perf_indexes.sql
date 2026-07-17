-- =============================================================================
-- KANBAN PERFORMANCE INDEXES
--
-- Contesto: l'apertura di una board kanban filtra i task con
--   WHERE site_id = ? AND archived = false AND kanbanId = ?
-- sia in SSR (lib/server-data.ts fetchKanbanWithTasks) sia nell'API
-- (app/api/kanban/tasks/route.ts). La tabella "Task" nella baseline ha indici
-- solo su colonne secondarie (sellProductId, is_draft, task_type, ...), quindi
-- quel filtro forza uno scan sequenziale al crescere dei task.
--
-- Aggiungiamo indici compositi sui pattern di filtro reali:
--   1) Task(site_id, kanbanId, archived) -> apertura board
--   2) Task(site_id, archived)           -> vista diagramma (conteggi per sito)
--   3) Action(taskId)                    -> storico task (evita lo scan di tutte
--      le Action del sito quando si idrata una board)
--   4) Kanban(site_id, identifier)       -> lookup fetchSingleKanban
--
-- Nota deploy: qui usiamo CREATE INDEX standard (coerente con la baseline e
-- con l'esecuzione transazionale delle migration Supabase). Su una tabella
-- Task molto grande, per evitare lock in scrittura durante la creazione, gli
-- stessi indici possono essere creati manualmente con
--   CREATE INDEX CONCURRENTLY ...  (fuori da una transazione)
-- prima di applicare questa migration; le clausole IF NOT EXISTS la rendono
-- idempotente in quel caso.
-- =============================================================================

CREATE INDEX IF NOT EXISTS "idx_task_site_kanban_archived"
    ON "public"."Task" USING "btree" ("site_id", "kanbanId", "archived");

CREATE INDEX IF NOT EXISTS "idx_task_site_archived"
    ON "public"."Task" USING "btree" ("site_id", "archived");

CREATE INDEX IF NOT EXISTS "idx_action_task_id"
    ON "public"."Action" USING "btree" ("taskId");

CREATE INDEX IF NOT EXISTS "idx_kanban_site_identifier"
    ON "public"."Kanban" USING "btree" ("site_id", "identifier");
