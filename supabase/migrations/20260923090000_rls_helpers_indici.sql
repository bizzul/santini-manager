-- =============================================================================
-- RLS hardening — Step 1: helper e indici di supporto alle policy
-- =============================================================================
-- Nessun dato viene modificato. Nessuna RLS viene attivata qui.
--
-- NOTA su is_superadmin(): la funzione ESISTE GIA' (creata da
-- 20260709130000_manager_projects.sql) ed e' usata da 18 policy di support_*,
-- pm_* e manager_*, tutte "to authenticated". Qui viene ridefinita usando
-- User.auth_id (uuid) invece di User."authId" (text) e con auth.uid() avvolta in
-- una subquery, che il planner valuta una volta sola per statement invece che
-- per riga. Le due colonne sono valorizzate e coincidenti su tutte le righe di
-- User (verificato il 22.09.2026: 59 righe, 0 NULL, 0 discordanze), quindi il
-- comportamento resta identico.
-- =============================================================================

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."User" u
    where u.auth_id = (select auth.uid())
      and u.role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

-- -----------------------------------------------------------------------------
-- user_in_organization(): appartenenza dell'utente corrente a un'organizzazione.
--
-- Serve perche' una policy su user_organizations che interroga user_organizations
-- andrebbe in ricorsione infinita. SECURITY DEFINER rompe la ricorsione.
-- -----------------------------------------------------------------------------
create or replace function public.user_in_organization(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_organizations uo
    where uo.organization_id = target_org_id
      and uo.user_id = (select auth.uid())
  );
$$;

revoke all on function public.user_in_organization(uuid) from public, anon;
grant execute on function public.user_in_organization(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- user_shares_tenancy_with(): l'utente corrente e l'utente target condividono
-- almeno un'organizzazione o almeno un sito.
--
-- E' il criterio di visibilita' fra collaboratori. Il ramo "organizzazione" serve
-- alle dropdown di app/sites/[domain]/collaborators/actions.ts, che propongono
-- utenti dell'organizzazione NON ancora assegnati al sito: con il solo ramo
-- "sito" quella lista risulterebbe sempre vuota.
-- -----------------------------------------------------------------------------
create or replace function public.user_shares_tenancy_with(target_auth_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_auth_id is not null and (
    exists (
      select 1
      from public.user_organizations mine
      join public.user_organizations theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = target_auth_id
    )
    or exists (
      select 1
      from public.user_sites mine
      join public.user_sites theirs
        on theirs.site_id = mine.site_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = target_auth_id
    )
  );
$$;

revoke all on function public.user_shares_tenancy_with(uuid) from public, anon;
grant execute on function public.user_shares_tenancy_with(uuid) to authenticated;

-- =============================================================================
-- Indici a supporto delle policy
-- =============================================================================
-- Vengono creati SOLO se non esiste gia' un indice con quella colonna in prima
-- posizione. Sul DB remoto del 22.09.2026 la maggior parte esiste gia':
-- creare un omonimo con nome diverso produrrebbe indici duplicati inutili.
--
-- Non e' incluso "TaskHistory"("taskId"): l'indice idx_taskhistory_taskid esiste
-- gia' (valido, 6 MB). Il file idempotente supabase/manual/20260923_taskhistory_taskid_idx.sql
-- resta disponibile per ambienti dove mancasse, da lanciare CONCURRENTLY fuori
-- migration.
-- =============================================================================

do $$
declare
  target record;
  has_index boolean;
begin
  for target in
    select *
    from (values
      ('user_sites',            'user_id',          'user_sites_user_id_site_id_idx'),
      ('user_organizations',    'user_id',          'user_organizations_user_id_org_id_idx'),
      ('KanbanColumn',          'kanbanId',         'KanbanColumn_kanbanId_idx'),
      ('TaskSupplier',          'taskId',           'TaskSupplier_taskId_idx'),
      ('ClientAddress',         'clientId',         'ClientAddress_clientId_idx'),
      ('File',                  'taskId',           'File_taskId_idx'),
      ('File',                  'sellProductId',    'File_sellProductId_rls_idx'),
      ('File',                  'errortrackingId',  'File_errortrackingId_idx'),
      ('PackingItem',           'packingControlId', 'PackingItem_packingControlId_idx'),
      ('Qc_item',               'qualityControlId', 'Qc_item_qualityControlId_idx'),
      ('_RolesToTimetracking',  'B',                'RolesToTimetracking_B_idx'),
      ('_RolesToUser',          'B',                'RolesToUser_B_idx')
    ) as t(tbl, col, idx)
  loop
    -- esiste gia' un indice su public.<tbl> con <col> in PRIMA posizione?
    select exists (
      select 1
      from pg_index i
      join pg_class c   on c.oid = i.indrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
      where n.nspname = 'public'
        and c.relname = target.tbl
        and a.attname = target.col
    ) into has_index;

    if not has_index then
      execute format(
        'create index %I on public.%I (%I)',
        target.idx, target.tbl, target.col
      );
      raise notice 'creato indice % su public.%(%)', target.idx, target.tbl, target.col;
    else
      raise notice 'saltato %: public.%(%) ha gia'' un indice', target.idx, target.tbl, target.col;
    end if;
  end loop;
end
$$;

-- Verifica: elenca gli indici effettivamente presenti sulle colonne usate dalle policy.
-- select c.relname as tabella, i.relname as indice, pg_get_indexdef(i.oid)
-- from pg_class c
-- join pg_index x on x.indrelid = c.oid
-- join pg_class i on i.oid = x.indexrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname in ('user_sites','user_organizations','KanbanColumn','TaskSupplier',
--                     'ClientAddress','File','PackingItem','Qc_item',
--                     '_RolesToTimetracking','_RolesToUser','TaskHistory')
-- order by 1, 2;
