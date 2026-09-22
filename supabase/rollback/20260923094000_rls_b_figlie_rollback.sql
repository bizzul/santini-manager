-- =============================================================================
-- ROLLBACK di 20260923094000_rls_b_figlie.sql
-- =============================================================================
-- Spegne la RLS e rimuove le policy sulle tabelle figlie.
-- TaskHistory ha il suo rollback separato:
-- 20260923094100_rls_b_taskhistory_rollback.sql
--
-- Dopo il rollback queste tabelle tornano leggibili e scrivibili con la chiave
-- anon da chiunque: usarlo solo per sbloccare un incidente.
-- =============================================================================

alter table public."KanbanColumn" disable row level security;
drop policy if exists "kanbancolumn_select_parent" on public."KanbanColumn";
drop policy if exists "kanbancolumn_insert_parent" on public."KanbanColumn";
drop policy if exists "kanbancolumn_update_parent" on public."KanbanColumn";
drop policy if exists "kanbancolumn_delete_parent" on public."KanbanColumn";

alter table public."TaskSupplier" disable row level security;
drop policy if exists "tasksupplier_select_parent" on public."TaskSupplier";
drop policy if exists "tasksupplier_insert_parent" on public."TaskSupplier";
drop policy if exists "tasksupplier_update_parent" on public."TaskSupplier";
drop policy if exists "tasksupplier_delete_parent" on public."TaskSupplier";

alter table public."ClientAddress" disable row level security;
drop policy if exists "clientaddress_select_parent" on public."ClientAddress";
drop policy if exists "clientaddress_insert_parent" on public."ClientAddress";
drop policy if exists "clientaddress_update_parent" on public."ClientAddress";
drop policy if exists "clientaddress_delete_parent" on public."ClientAddress";

alter table public."PackingItem" disable row level security;
drop policy if exists "packingitem_select_parent" on public."PackingItem";
drop policy if exists "packingitem_insert_parent" on public."PackingItem";
drop policy if exists "packingitem_update_parent" on public."PackingItem";
drop policy if exists "packingitem_delete_parent" on public."PackingItem";

alter table public."Qc_item" disable row level security;
drop policy if exists "qc_item_select_parent" on public."Qc_item";
drop policy if exists "qc_item_insert_parent" on public."Qc_item";
drop policy if exists "qc_item_update_parent" on public."Qc_item";
drop policy if exists "qc_item_delete_parent" on public."Qc_item";

alter table public."_RolesToTimetracking" disable row level security;
drop policy if exists "rolestotimetracking_select_parent" on public."_RolesToTimetracking";
drop policy if exists "rolestotimetracking_insert_parent" on public."_RolesToTimetracking";
drop policy if exists "rolestotimetracking_update_parent" on public."_RolesToTimetracking";
drop policy if exists "rolestotimetracking_delete_parent" on public."_RolesToTimetracking";

alter table public."File" disable row level security;
drop policy if exists "file_select_parent" on public."File";
drop policy if exists "file_insert_parent" on public."File";
drop policy if exists "file_update_parent" on public."File";
drop policy if exists "file_delete_parent" on public."File";

alter table public."_RolesToUser" disable row level security;
drop policy if exists "rolestouser_select_visible_user" on public."_RolesToUser";
drop policy if exists "rolestouser_insert_visible_user" on public."_RolesToUser";
drop policy if exists "rolestouser_update_visible_user" on public."_RolesToUser";
drop policy if exists "rolestouser_delete_visible_user" on public."_RolesToUser";

alter table public."Checklist_item" disable row level security;
drop policy if exists "checklist_item_all_superadmin" on public."Checklist_item";
