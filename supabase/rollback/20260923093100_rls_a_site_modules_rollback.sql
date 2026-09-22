-- =============================================================================
-- ROLLBACK — Ondata A: site_modules
-- =============================================================================
-- Spegne la RLS e rimuove le policy create dalla migration gemella.
-- Dopo il rollback queste tabelle tornano leggibili e scrivibili con la chiave
-- anon da chiunque: usarlo solo per sbloccare un incidente.
-- =============================================================================

alter table public.site_modules disable row level security;
drop policy if exists "site_modules_select_site" on public.site_modules;
drop policy if exists "site_modules_insert_superadmin" on public.site_modules;
drop policy if exists "site_modules_update_superadmin" on public.site_modules;
drop policy if exists "site_modules_delete_superadmin" on public.site_modules;

