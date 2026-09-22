-- =============================================================================
-- ROLLBACK di 20260923095100_rls_c_sites_organizations.sql
-- =============================================================================
-- NON ricrea superadmin_can_access_all_sites: quella policy era inerte
-- (auth.role() non vale mai 'superadmin') ed e' stata rimossa dallo Step 2.
-- Per ripristinarla usare 20260923091000_rls_fix_policy_errate_rollback.sql.
-- =============================================================================

alter table public.sites disable row level security;
drop policy if exists "sites_select_access"      on public.sites;
drop policy if exists "sites_update_site_admin"  on public.sites;
drop policy if exists "sites_insert_superadmin"  on public.sites;
drop policy if exists "sites_delete_superadmin"  on public.sites;

alter table public.organizations disable row level security;
drop policy if exists "organizations_select_member_or_site" on public.organizations;
drop policy if exists "organizations_insert_superadmin"     on public.organizations;
drop policy if exists "organizations_update_superadmin"     on public.organizations;
drop policy if exists "organizations_delete_superadmin"     on public.organizations;
