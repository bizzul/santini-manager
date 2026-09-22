-- =============================================================================
-- RLS hardening — Ondata A: Timetracking, Errortracking, Action, Exit_checklist, PackingControl, PackingMasterItem, QcMasterItem, QualityControl
-- =============================================================================
-- Righe al 22.09.2026: Timetracking 2 554 (0 NULL), Action 5 065 (1 867 NULL),
-- Errortracking 1 (1 NULL), tutte le altre vuote.
--
-- Nota su Action: gli insert applicativi valorizzano site_id solo se il contesto
-- sito e' disponibile (if (siteId) actionData.site_id = siteId). Con questa
-- policy un insert senza site_id viene rifiutato. Nel codice l'esito di quegli
-- insert non e' mai bloccante — o non viene controllato o viene solo loggato —
-- quindi l'azione utente non si rompe: si perde la riga di storico, che e'
-- il comportamento corretto.
-- Pattern: prima le policy, poi enable row level security, nella stessa migration.
-- Tutte le policy sono "to authenticated": il ruolo anon non compare mai, quindi
-- senza login queste tabelle restituiscono 0 righe e rifiutano ogni scrittura.
--
-- Nessun dato viene modificato.
-- =============================================================================

-- Timetracking
create policy "timetracking_select_site" on public."Timetracking"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "timetracking_insert_site" on public."Timetracking"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "timetracking_update_site" on public."Timetracking"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "timetracking_delete_site" on public."Timetracking"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Timetracking" enable row level security;

-- Errortracking
-- ECCEZIONE: 1 riga su 1 ha site_id NULL (storico).
-- Le righe con site_id NULL restano visibili SOLO al superadmin. In scrittura
-- site_id resta obbligatorio: non si creano nuove righe senza tenant.
-- Nessun backfill viene eseguito qui (vedi supabase/manual/).
create policy "errortracking_select_site" on public."Errortracking"
  for select to authenticated
  using (
    (site_id is not null and public.user_can_access_site(site_id))
    or (site_id is null and public.is_superadmin())
  );

create policy "errortracking_insert_site" on public."Errortracking"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "errortracking_update_site" on public."Errortracking"
  for update to authenticated
  using (
    (site_id is not null and public.user_can_access_site(site_id))
    or (site_id is null and public.is_superadmin())
  )
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "errortracking_delete_site" on public."Errortracking"
  for delete to authenticated
  using (
    (site_id is not null and public.user_can_access_site(site_id))
    or (site_id is null and public.is_superadmin())
  );

alter table public."Errortracking" enable row level security;

-- Action
-- ECCEZIONE: 1 867 righe su 5 065 hanno site_id NULL (storico).
-- Le righe con site_id NULL restano visibili SOLO al superadmin. In scrittura
-- site_id resta obbligatorio: non si creano nuove righe senza tenant.
-- Nessun backfill viene eseguito qui (vedi supabase/manual/).
create policy "action_select_site" on public."Action"
  for select to authenticated
  using (
    (site_id is not null and public.user_can_access_site(site_id))
    or (site_id is null and public.is_superadmin())
  );

create policy "action_insert_site" on public."Action"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "action_update_site" on public."Action"
  for update to authenticated
  using (
    (site_id is not null and public.user_can_access_site(site_id))
    or (site_id is null and public.is_superadmin())
  )
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "action_delete_site" on public."Action"
  for delete to authenticated
  using (
    (site_id is not null and public.user_can_access_site(site_id))
    or (site_id is null and public.is_superadmin())
  );

alter table public."Action" enable row level security;

-- Exit_checklist
create policy "exit_checklist_select_site" on public."Exit_checklist"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "exit_checklist_insert_site" on public."Exit_checklist"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "exit_checklist_update_site" on public."Exit_checklist"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "exit_checklist_delete_site" on public."Exit_checklist"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Exit_checklist" enable row level security;

-- PackingControl
create policy "packingcontrol_select_site" on public."PackingControl"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "packingcontrol_insert_site" on public."PackingControl"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "packingcontrol_update_site" on public."PackingControl"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "packingcontrol_delete_site" on public."PackingControl"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."PackingControl" enable row level security;

-- PackingMasterItem
create policy "packingmasteritem_select_site" on public."PackingMasterItem"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "packingmasteritem_insert_site" on public."PackingMasterItem"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "packingmasteritem_update_site" on public."PackingMasterItem"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "packingmasteritem_delete_site" on public."PackingMasterItem"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."PackingMasterItem" enable row level security;

-- QcMasterItem
create policy "qcmasteritem_select_site" on public."QcMasterItem"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "qcmasteritem_insert_site" on public."QcMasterItem"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "qcmasteritem_update_site" on public."QcMasterItem"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "qcmasteritem_delete_site" on public."QcMasterItem"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."QcMasterItem" enable row level security;

-- QualityControl
create policy "qualitycontrol_select_site" on public."QualityControl"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "qualitycontrol_insert_site" on public."QualityControl"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "qualitycontrol_update_site" on public."QualityControl"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "qualitycontrol_delete_site" on public."QualityControl"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."QualityControl" enable row level security;

