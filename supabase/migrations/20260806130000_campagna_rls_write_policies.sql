-- Fix: inserting/updating campaign rows failed with
--   "new row violates row-level security policy for table campagna_*"
-- The campagna_* tables had (at most) SELECT policies; write commands had no
-- permissive policy, so every INSERT/UPDATE/DELETE was denied.
--
-- We reuse the repo-wide, already-existing SECURITY DEFINER helper
-- public.user_can_access_site(uuid) (based on user_sites / user_organizations)
-- so access stays scoped to the user's sites via the SAME mechanism as every
-- other multi-tenant table. No NEW security-definer function is introduced.
--
-- Policies are permissive and additive; existing SELECT policies keep working.
-- Idempotent via DROP POLICY IF EXISTS.

do $$
declare
  t text;
  tables text[] := array[
    'campagna_tag',
    'campagna_contatti',
    'campagna_interazioni',
    'campagna_eventi',
    'campagna_contenuti',
    'campagna_report'
  ];
begin
  foreach t in array tables loop
    -- Make sure RLS is on (no-op if already enabled).
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_site_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_site_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_site_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_site_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.user_can_access_site(site_id))',
      t || '_site_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.user_can_access_site(site_id))',
      t || '_site_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.user_can_access_site(site_id)) with check (public.user_can_access_site(site_id))',
      t || '_site_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.user_can_access_site(site_id))',
      t || '_site_delete', t);
  end loop;
end $$;

-- Junction tables have no site_id: authorize via their parent row's site.
alter table public.campagna_contatti_tag enable row level security;
drop policy if exists campagna_contatti_tag_site_all on public.campagna_contatti_tag;
create policy campagna_contatti_tag_site_all on public.campagna_contatti_tag
  for all to authenticated
  using (
    exists (
      select 1 from public.campagna_contatti c
      where c.id = campagna_contatti_tag.contatto_id
        and public.user_can_access_site(c.site_id)
    )
  )
  with check (
    exists (
      select 1 from public.campagna_contatti c
      where c.id = campagna_contatti_tag.contatto_id
        and public.user_can_access_site(c.site_id)
    )
  );

alter table public.campagna_eventi_volontari enable row level security;
drop policy if exists campagna_eventi_volontari_site_all on public.campagna_eventi_volontari;
create policy campagna_eventi_volontari_site_all on public.campagna_eventi_volontari
  for all to authenticated
  using (
    exists (
      select 1 from public.campagna_eventi e
      where e.id = campagna_eventi_volontari.evento_id
        and public.user_can_access_site(e.site_id)
    )
  )
  with check (
    exists (
      select 1 from public.campagna_eventi e
      where e.id = campagna_eventi_volontari.evento_id
        and public.user_can_access_site(e.site_id)
    )
  );
