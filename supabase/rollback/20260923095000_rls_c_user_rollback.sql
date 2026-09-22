-- =============================================================================
-- ROLLBACK di 20260923095000_rls_c_user.sql
-- =============================================================================
-- Da usare se dopo l'attivazione si rompono login, dropdown assegnatari,
-- elenco collaboratori o realtime su User.
-- =============================================================================

alter table public."User" disable row level security;
drop policy if exists "user_select_self_or_tenancy" on public."User";
drop policy if exists "user_insert_admin"           on public."User";
drop policy if exists "user_update_self_or_admin"   on public."User";
drop policy if exists "user_delete_admin"           on public."User";
