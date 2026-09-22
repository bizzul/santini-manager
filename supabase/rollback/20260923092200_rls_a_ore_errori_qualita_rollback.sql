-- =============================================================================
-- ROLLBACK — Ondata A: Timetracking, Errortracking, Action, Exit_checklist, PackingControl, PackingMasterItem, QcMasterItem, QualityControl
-- =============================================================================
-- Spegne la RLS e rimuove le policy create dalla migration gemella.
-- Dopo il rollback queste tabelle tornano leggibili e scrivibili con la chiave
-- anon da chiunque: usarlo solo per sbloccare un incidente.
-- =============================================================================

-- Timetracking
alter table public."Timetracking" disable row level security;
drop policy if exists "timetracking_select_site" on public."Timetracking";
drop policy if exists "timetracking_insert_site" on public."Timetracking";
drop policy if exists "timetracking_update_site" on public."Timetracking";
drop policy if exists "timetracking_delete_site" on public."Timetracking";

-- Errortracking
alter table public."Errortracking" disable row level security;
drop policy if exists "errortracking_select_site" on public."Errortracking";
drop policy if exists "errortracking_insert_site" on public."Errortracking";
drop policy if exists "errortracking_update_site" on public."Errortracking";
drop policy if exists "errortracking_delete_site" on public."Errortracking";

-- Action
alter table public."Action" disable row level security;
drop policy if exists "action_select_site" on public."Action";
drop policy if exists "action_insert_site" on public."Action";
drop policy if exists "action_update_site" on public."Action";
drop policy if exists "action_delete_site" on public."Action";

-- Exit_checklist
alter table public."Exit_checklist" disable row level security;
drop policy if exists "exit_checklist_select_site" on public."Exit_checklist";
drop policy if exists "exit_checklist_insert_site" on public."Exit_checklist";
drop policy if exists "exit_checklist_update_site" on public."Exit_checklist";
drop policy if exists "exit_checklist_delete_site" on public."Exit_checklist";

-- PackingControl
alter table public."PackingControl" disable row level security;
drop policy if exists "packingcontrol_select_site" on public."PackingControl";
drop policy if exists "packingcontrol_insert_site" on public."PackingControl";
drop policy if exists "packingcontrol_update_site" on public."PackingControl";
drop policy if exists "packingcontrol_delete_site" on public."PackingControl";

-- PackingMasterItem
alter table public."PackingMasterItem" disable row level security;
drop policy if exists "packingmasteritem_select_site" on public."PackingMasterItem";
drop policy if exists "packingmasteritem_insert_site" on public."PackingMasterItem";
drop policy if exists "packingmasteritem_update_site" on public."PackingMasterItem";
drop policy if exists "packingmasteritem_delete_site" on public."PackingMasterItem";

-- QcMasterItem
alter table public."QcMasterItem" disable row level security;
drop policy if exists "qcmasteritem_select_site" on public."QcMasterItem";
drop policy if exists "qcmasteritem_insert_site" on public."QcMasterItem";
drop policy if exists "qcmasteritem_update_site" on public."QcMasterItem";
drop policy if exists "qcmasteritem_delete_site" on public."QcMasterItem";

-- QualityControl
alter table public."QualityControl" disable row level security;
drop policy if exists "qualitycontrol_select_site" on public."QualityControl";
drop policy if exists "qualitycontrol_insert_site" on public."QualityControl";
drop policy if exists "qualitycontrol_update_site" on public."QualityControl";
drop policy if exists "qualitycontrol_delete_site" on public."QualityControl";

