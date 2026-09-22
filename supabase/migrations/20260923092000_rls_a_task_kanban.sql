-- =============================================================================
-- RLS hardening — Ondata A: Task, Kanban, KanbanCategory
-- =============================================================================
-- Task e' in supabase_realtime: dopo la RLS ogni client riceve in tempo reale
-- solo le righe che puo' leggere. E' il comportamento voluto.
--
-- Task ha 866 righe, 0 con site_id NULL. Kanban 97 e KanbanCategory 49, idem.
-- Nessuna riga diventa invisibile al proprietario.
-- Pattern: prima le policy, poi enable row level security, nella stessa migration.
-- Tutte le policy sono "to authenticated": il ruolo anon non compare mai, quindi
-- senza login queste tabelle restituiscono 0 righe e rifiutano ogni scrittura.
--
-- Nessun dato viene modificato.
-- =============================================================================

-- Task
create policy "task_select_site" on public."Task"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "task_insert_site" on public."Task"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "task_update_site" on public."Task"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "task_delete_site" on public."Task"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Task" enable row level security;

-- Kanban
create policy "kanban_select_site" on public."Kanban"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "kanban_insert_site" on public."Kanban"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "kanban_update_site" on public."Kanban"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "kanban_delete_site" on public."Kanban"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Kanban" enable row level security;

-- KanbanCategory
create policy "kanbancategory_select_site" on public."KanbanCategory"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "kanbancategory_insert_site" on public."KanbanCategory"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "kanbancategory_update_site" on public."KanbanCategory"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "kanbancategory_delete_site" on public."KanbanCategory"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."KanbanCategory" enable row level security;

