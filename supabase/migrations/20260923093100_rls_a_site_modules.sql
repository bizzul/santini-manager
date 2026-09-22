-- =============================================================================
-- RLS hardening — Ondata A: site_modules
-- =============================================================================
-- ECCEZIONE: i moduli di uno spazio li gestisce il superadmin.
-- Verificato allo Step 0:
--   app/api/sites/[domain]/modules/route.ts:147  -> 403 se role !== 'superadmin'
--   app/(administration)/administration/sites/actions.ts:16 -> canAccessAllOrganizations
-- Quindi: SELECT a chiunque abbia accesso al sito (serve alla navigazione e ai
-- menu), scrittura solo is_superadmin().
--
-- site_id e' NOT NULL su questa tabella (492 righe).
-- Pattern: prima le policy, poi enable row level security, nella stessa migration.
-- Tutte le policy sono "to authenticated": il ruolo anon non compare mai, quindi
-- senza login queste tabelle restituiscono 0 righe e rifiutano ogni scrittura.
--
-- Nessun dato viene modificato.
-- =============================================================================

create policy "site_modules_select_site" on public.site_modules
  for select to authenticated
  using (public.user_can_access_site(site_id));

create policy "site_modules_insert_superadmin" on public.site_modules
  for insert to authenticated
  with check (public.is_superadmin());

create policy "site_modules_update_superadmin" on public.site_modules
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "site_modules_delete_superadmin" on public.site_modules
  for delete to authenticated
  using (public.is_superadmin());

alter table public.site_modules enable row level security;

