-- =============================================================================
-- RLS hardening — Ondata B: TaskHistory (migration separata e ULTIMA dell'ondata)
-- =============================================================================
-- TaskHistory e' la tabella piu' pesante del DB: 592 451 righe, 946 MB.
-- Ogni policy fa un lookup su Task per riga candidata, quindi l'indice su
-- "TaskHistory"("taskId") e' un prerequisito operativo.
--
-- STATO AL 22.09.2026 sul progetto jzxffusiwtrvjwmpjztu:
--   idx_taskhistory_taskid ESISTE GIA', valido, ready, 6104 kB.
--   Il prerequisito e' quindi gia' soddisfatto e questa migration si puo'
--   applicare subito dopo 20260923094000_rls_b_figlie.sql.
--
-- Su un ambiente dove l'indice mancasse, applicare PRIMA
-- supabase/manual/20260923_taskhistory_taskid_idx.sql (CREATE INDEX
-- CONCURRENTLY, fuori orario) e solo dopo questa migration.
--
-- Verifica del prerequisito:
--   select indexname from pg_indexes
--    where schemaname='public' and tablename='TaskHistory';
--
-- Nessun dato viene modificato.
-- =============================================================================

-- Guardia: se l'indice su ("taskId") manca, la migration si ferma invece di
-- attivare la RLS su una tabella da 946 MB senza supporto d'indice.
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class c     on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
    where n.nspname = 'public'
      and c.relname = 'TaskHistory'
      and a.attname = 'taskId'
      and i.indisvalid
  ) then
    raise exception using
      message = 'Manca un indice valido su public."TaskHistory"("taskId").',
      hint    = 'Eseguire prima supabase/manual/20260923_taskhistory_taskid_idx.sql (CREATE INDEX CONCURRENTLY), poi ripetere questa migration.';
  end if;
end
$$;

create policy "taskhistory_select_parent" on public."TaskHistory"
  for select to authenticated
  using (exists (select 1 from public."Task" t
                 where t.id = "TaskHistory"."taskId"
                   and public.user_can_access_site(t.site_id)));

create policy "taskhistory_insert_parent" on public."TaskHistory"
  for insert to authenticated
  with check (exists (select 1 from public."Task" t
                      where t.id = "TaskHistory"."taskId"
                        and public.user_can_access_site(t.site_id)));

create policy "taskhistory_update_parent" on public."TaskHistory"
  for update to authenticated
  using (exists (select 1 from public."Task" t
                 where t.id = "TaskHistory"."taskId"
                   and public.user_can_access_site(t.site_id)))
  with check (exists (select 1 from public."Task" t
                      where t.id = "TaskHistory"."taskId"
                        and public.user_can_access_site(t.site_id)));

create policy "taskhistory_delete_parent" on public."TaskHistory"
  for delete to authenticated
  using (exists (select 1 from public."Task" t
                 where t.id = "TaskHistory"."taskId"
                   and public.user_can_access_site(t.site_id)));

alter table public."TaskHistory" enable row level security;

-- -----------------------------------------------------------------------------
-- Misura del costo, da eseguire DOPO l'applicazione, con una sessione utente
-- (non con il service role, che bypassa la RLS e non misura nulla di utile):
--
--   explain (analyze, buffers)
--   select * from public."TaskHistory" where "taskId" = <id di un task accessibile>;
--
-- Atteso: Index Scan using idx_taskhistory_taskid, piu' una Subquery/Filter per
-- la policy. Il lookup su Task e' un Index Scan su Task_pkey.
-- Se compare un Seq Scan su TaskHistory, l'indice non viene usato: fermarsi e
-- applicare il rollback.
-- -----------------------------------------------------------------------------
