-- =============================================================================
-- ROLLBACK — Ondata A: Task, Kanban, KanbanCategory
-- =============================================================================
-- Spegne la RLS e rimuove le policy create dalla migration gemella.
-- Dopo il rollback queste tabelle tornano leggibili e scrivibili con la chiave
-- anon da chiunque: usarlo solo per sbloccare un incidente.
-- =============================================================================

-- Task
alter table public."Task" disable row level security;
drop policy if exists "task_select_site" on public."Task";
drop policy if exists "task_insert_site" on public."Task";
drop policy if exists "task_update_site" on public."Task";
drop policy if exists "task_delete_site" on public."Task";

-- Kanban
alter table public."Kanban" disable row level security;
drop policy if exists "kanban_select_site" on public."Kanban";
drop policy if exists "kanban_insert_site" on public."Kanban";
drop policy if exists "kanban_update_site" on public."Kanban";
drop policy if exists "kanban_delete_site" on public."Kanban";

-- KanbanCategory
alter table public."KanbanCategory" disable row level security;
drop policy if exists "kanbancategory_select_site" on public."KanbanCategory";
drop policy if exists "kanbancategory_insert_site" on public."KanbanCategory";
drop policy if exists "kanbancategory_update_site" on public."KanbanCategory";
drop policy if exists "kanbancategory_delete_site" on public."KanbanCategory";

