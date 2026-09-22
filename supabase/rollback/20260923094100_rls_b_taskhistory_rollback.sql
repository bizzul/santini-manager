-- =============================================================================
-- ROLLBACK di 20260923094100_rls_b_taskhistory.sql
-- =============================================================================
-- Da usare se, dopo l'attivazione, la lettura di TaskHistory degrada
-- (Seq Scan su 946 MB) o se gli snapshot kanban smettono di funzionare.
--
-- Non tocca l'indice idx_taskhistory_taskid, che e' preesistente.
-- =============================================================================

alter table public."TaskHistory" disable row level security;
drop policy if exists "taskhistory_select_parent" on public."TaskHistory";
drop policy if exists "taskhistory_insert_parent" on public."TaskHistory";
drop policy if exists "taskhistory_update_parent" on public."TaskHistory";
drop policy if exists "taskhistory_delete_parent" on public."TaskHistory";
