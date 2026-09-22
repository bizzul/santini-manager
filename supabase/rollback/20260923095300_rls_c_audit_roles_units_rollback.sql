-- =============================================================================
-- ROLLBACK di 20260923095300_rls_c_audit_roles_units.sql
-- =============================================================================
-- Ripristina anche la SELECT true per il ruolo public su inventory_units:
-- dopo il rollback quella tabella torna leggibile senza login.
-- =============================================================================

alter table public.audit_logs disable row level security;
drop policy if exists "audit_logs_select_superadmin" on public.audit_logs;
drop policy if exists "audit_logs_insert_self"       on public.audit_logs;

alter table public."Roles" disable row level security;
drop policy if exists "roles_select_global_or_site" on public."Roles";
drop policy if exists "roles_insert_admin"          on public."Roles";
drop policy if exists "roles_update_admin"          on public."Roles";
drop policy if exists "roles_delete_admin"          on public."Roles";

alter table public.inventory_units disable row level security;
drop policy if exists "inventory_units_select_authenticated" on public.inventory_units;
drop policy if exists "inventory_units_insert_superadmin"    on public.inventory_units;
drop policy if exists "inventory_units_update_superadmin"    on public.inventory_units;
drop policy if exists "inventory_units_delete_superadmin"    on public.inventory_units;

create policy "inventory_units_select" on public.inventory_units
  for select using (true);
