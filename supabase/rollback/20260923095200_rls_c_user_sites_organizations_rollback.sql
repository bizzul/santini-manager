-- =============================================================================
-- ROLLBACK di 20260923095200_rls_c_user_sites_organizations.sql
-- =============================================================================
-- Ripristina le policy originali, auto-assegnazione inclusa: dopo questo
-- rollback qualsiasi utente autenticato puo' di nuovo inserirsi in uno spazio
-- o in un'organizzazione qualsiasi. Usarlo solo per sbloccare un incidente.
-- =============================================================================

alter table public.user_sites disable row level security;
drop policy if exists "user_sites_select_own_or_site"        on public.user_sites;
drop policy if exists "user_sites_insert_site_admin"         on public.user_sites;
drop policy if exists "user_sites_update_own_or_site_admin"  on public.user_sites;
drop policy if exists "user_sites_delete_own_or_site_admin"  on public.user_sites;

create policy "Users can view their own site relationships" on public.user_sites
  for select using (auth.uid() = user_id);
create policy "Users can insert their own site relationships" on public.user_sites
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own site relationships" on public.user_sites
  for update using (auth.uid() = user_id);
create policy "Users can delete their own site relationships" on public.user_sites
  for delete using (auth.uid() = user_id);

alter table public.user_organizations disable row level security;
drop policy if exists "user_organizations_select_own_or_org"     on public.user_organizations;
drop policy if exists "user_organizations_insert_admin_of_org"   on public.user_organizations;
drop policy if exists "user_organizations_update_admin_of_org"   on public.user_organizations;
drop policy if exists "user_organizations_delete_own_or_admin"   on public.user_organizations;

create policy "Users can view their own organization relationships" on public.user_organizations
  for select using (auth.uid() = user_id);
create policy "Users can insert their own organization relationships" on public.user_organizations
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own organization relationships" on public.user_organizations
  for update using (auth.uid() = user_id);
create policy "Users can delete their own organization relationships" on public.user_organizations
  for delete using (auth.uid() = user_id);
create policy "Superadmins can manage all organization relationships" on public.user_organizations
  for all using (exists (
    select 1 from public."User"
    where "User".auth_id = auth.uid() and "User".role = 'superadmin'
  ));
