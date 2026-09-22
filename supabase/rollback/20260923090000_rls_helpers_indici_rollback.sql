-- =============================================================================
-- ROLLBACK di 20260923090000_rls_helpers_indici.sql
-- =============================================================================
-- ATTENZIONE: is_superadmin() NON va droppata. Esisteva prima di questo lavoro
-- ed e' usata da 18 policy di support_*, pm_* e manager_*. Qui viene ripristinata
-- la definizione originale di 20260709130000_manager_projects.sql, insieme ai
-- grant di default che aveva (anon incluso).
-- =============================================================================

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."User" u
    where u."authId" = auth.uid()::text
      and u.role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to anon;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.is_superadmin() to service_role;

-- Helper introdotti da questa migration: non esistevano prima, si possono droppare.
drop function if exists public.user_shares_tenancy_with(uuid);
drop function if exists public.user_in_organization(uuid);

-- Indici: i nomi sono esclusivi di questa migration. Quelli preesistenti
-- (idx_user_sites_user_site, idx_taskhistory_taskid, File_sellProductId_idx, ...)
-- non vengono toccati.
drop index if exists public.user_sites_user_id_site_id_idx;
drop index if exists public.user_organizations_user_id_org_id_idx;
drop index if exists public."KanbanColumn_kanbanId_idx";
drop index if exists public."TaskSupplier_taskId_idx";
drop index if exists public."ClientAddress_clientId_idx";
drop index if exists public."File_taskId_idx";
drop index if exists public."File_sellProductId_rls_idx";
drop index if exists public."File_errortrackingId_idx";
drop index if exists public."PackingItem_packingControlId_idx";
drop index if exists public."Qc_item_qualityControlId_idx";
drop index if exists public."RolesToTimetracking_B_idx";
drop index if exists public."RolesToUser_B_idx";
