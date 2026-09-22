-- =============================================================================
-- RLS hardening — Ondata B: tabelle figlie senza site_id
-- =============================================================================
-- L'accesso passa dalla tabella padre, gia' protetta dall'ondata A.
-- TaskHistory NON e' qui: sta nella migration separata e successiva
-- 20260923094100_rls_b_taskhistory.sql.
--
-- Tutte le policy sono "to authenticated". Nessun dato viene modificato.
--
-- PREREQUISITO: l'ondata A deve essere gia' applicata, altrimenti queste
-- policy interrogano tabelle padre ancora senza RLS (funzionano comunque,
-- ma la protezione e' parziale).
-- =============================================================================


-- =============================================================================
-- KanbanColumn -> Kanban."kanbanId"
-- =============================================================================
create policy "kanbancolumn_select_parent" on public."KanbanColumn"
  for select to authenticated
  using (exists (select 1 from public."Kanban" k
                 where k.id = "KanbanColumn"."kanbanId"
                   and public.user_can_access_site(k.site_id)));

create policy "kanbancolumn_insert_parent" on public."KanbanColumn"
  for insert to authenticated
  with check (exists (select 1 from public."Kanban" k
                      where k.id = "KanbanColumn"."kanbanId"
                        and public.user_can_access_site(k.site_id)));

create policy "kanbancolumn_update_parent" on public."KanbanColumn"
  for update to authenticated
  using (exists (select 1 from public."Kanban" k
                 where k.id = "KanbanColumn"."kanbanId"
                   and public.user_can_access_site(k.site_id)))
  with check (exists (select 1 from public."Kanban" k
                      where k.id = "KanbanColumn"."kanbanId"
                        and public.user_can_access_site(k.site_id)));

create policy "kanbancolumn_delete_parent" on public."KanbanColumn"
  for delete to authenticated
  using (exists (select 1 from public."Kanban" k
                 where k.id = "KanbanColumn"."kanbanId"
                   and public.user_can_access_site(k.site_id)));

alter table public."KanbanColumn" enable row level security;


-- =============================================================================
-- TaskSupplier -> Task."taskId"
-- =============================================================================
create policy "tasksupplier_select_parent" on public."TaskSupplier"
  for select to authenticated
  using (exists (select 1 from public."Task" t
                 where t.id = "TaskSupplier"."taskId"
                   and public.user_can_access_site(t.site_id)));

create policy "tasksupplier_insert_parent" on public."TaskSupplier"
  for insert to authenticated
  with check (exists (select 1 from public."Task" t
                      where t.id = "TaskSupplier"."taskId"
                        and public.user_can_access_site(t.site_id)));

create policy "tasksupplier_update_parent" on public."TaskSupplier"
  for update to authenticated
  using (exists (select 1 from public."Task" t
                 where t.id = "TaskSupplier"."taskId"
                   and public.user_can_access_site(t.site_id)))
  with check (exists (select 1 from public."Task" t
                      where t.id = "TaskSupplier"."taskId"
                        and public.user_can_access_site(t.site_id)));

create policy "tasksupplier_delete_parent" on public."TaskSupplier"
  for delete to authenticated
  using (exists (select 1 from public."Task" t
                 where t.id = "TaskSupplier"."taskId"
                   and public.user_can_access_site(t.site_id)));

alter table public."TaskSupplier" enable row level security;


-- =============================================================================
-- ClientAddress -> Client."clientId"
-- =============================================================================
create policy "clientaddress_select_parent" on public."ClientAddress"
  for select to authenticated
  using (exists (select 1 from public."Client" c
                 where c.id = "ClientAddress"."clientId"
                   and public.user_can_access_site(c.site_id)));

create policy "clientaddress_insert_parent" on public."ClientAddress"
  for insert to authenticated
  with check (exists (select 1 from public."Client" c
                      where c.id = "ClientAddress"."clientId"
                        and public.user_can_access_site(c.site_id)));

create policy "clientaddress_update_parent" on public."ClientAddress"
  for update to authenticated
  using (exists (select 1 from public."Client" c
                 where c.id = "ClientAddress"."clientId"
                   and public.user_can_access_site(c.site_id)))
  with check (exists (select 1 from public."Client" c
                      where c.id = "ClientAddress"."clientId"
                        and public.user_can_access_site(c.site_id)));

create policy "clientaddress_delete_parent" on public."ClientAddress"
  for delete to authenticated
  using (exists (select 1 from public."Client" c
                 where c.id = "ClientAddress"."clientId"
                   and public.user_can_access_site(c.site_id)));

alter table public."ClientAddress" enable row level security;


-- =============================================================================
-- PackingItem -> PackingControl."packingControlId"
-- =============================================================================
create policy "packingitem_select_parent" on public."PackingItem"
  for select to authenticated
  using (exists (select 1 from public."PackingControl" p
                 where p.id = "PackingItem"."packingControlId"
                   and public.user_can_access_site(p.site_id)));

create policy "packingitem_insert_parent" on public."PackingItem"
  for insert to authenticated
  with check (exists (select 1 from public."PackingControl" p
                      where p.id = "PackingItem"."packingControlId"
                        and public.user_can_access_site(p.site_id)));

create policy "packingitem_update_parent" on public."PackingItem"
  for update to authenticated
  using (exists (select 1 from public."PackingControl" p
                 where p.id = "PackingItem"."packingControlId"
                   and public.user_can_access_site(p.site_id)))
  with check (exists (select 1 from public."PackingControl" p
                      where p.id = "PackingItem"."packingControlId"
                        and public.user_can_access_site(p.site_id)));

create policy "packingitem_delete_parent" on public."PackingItem"
  for delete to authenticated
  using (exists (select 1 from public."PackingControl" p
                 where p.id = "PackingItem"."packingControlId"
                   and public.user_can_access_site(p.site_id)));

alter table public."PackingItem" enable row level security;


-- =============================================================================
-- Qc_item -> QualityControl."qualityControlId"
-- =============================================================================
create policy "qc_item_select_parent" on public."Qc_item"
  for select to authenticated
  using (exists (select 1 from public."QualityControl" q
                 where q.id = "Qc_item"."qualityControlId"
                   and public.user_can_access_site(q.site_id)));

create policy "qc_item_insert_parent" on public."Qc_item"
  for insert to authenticated
  with check (exists (select 1 from public."QualityControl" q
                      where q.id = "Qc_item"."qualityControlId"
                        and public.user_can_access_site(q.site_id)));

create policy "qc_item_update_parent" on public."Qc_item"
  for update to authenticated
  using (exists (select 1 from public."QualityControl" q
                 where q.id = "Qc_item"."qualityControlId"
                   and public.user_can_access_site(q.site_id)))
  with check (exists (select 1 from public."QualityControl" q
                      where q.id = "Qc_item"."qualityControlId"
                        and public.user_can_access_site(q.site_id)));

create policy "qc_item_delete_parent" on public."Qc_item"
  for delete to authenticated
  using (exists (select 1 from public."QualityControl" q
                 where q.id = "Qc_item"."qualityControlId"
                   and public.user_can_access_site(q.site_id)));

alter table public."Qc_item" enable row level security;


-- =============================================================================
-- _RolesToTimetracking -> Timetracking."B"
-- =============================================================================
-- Tabella di join Prisma: A = Roles.id, B = Timetracking.id.
-- Scritta dai collaboratori quando registrano le ore
-- (app/api/time-tracking/create|delete, timetracking/actions/*), quindi il
-- criterio e' l'accesso al sito del Timetracking, non il ruolo admin.
create policy "rolestotimetracking_select_parent" on public."_RolesToTimetracking"
  for select to authenticated
  using (exists (select 1 from public."Timetracking" tt
                 where tt.id = "_RolesToTimetracking"."B"
                   and public.user_can_access_site(tt.site_id)));

create policy "rolestotimetracking_insert_parent" on public."_RolesToTimetracking"
  for insert to authenticated
  with check (exists (select 1 from public."Timetracking" tt
                      where tt.id = "_RolesToTimetracking"."B"
                        and public.user_can_access_site(tt.site_id)));

create policy "rolestotimetracking_update_parent" on public."_RolesToTimetracking"
  for update to authenticated
  using (exists (select 1 from public."Timetracking" tt
                 where tt.id = "_RolesToTimetracking"."B"
                   and public.user_can_access_site(tt.site_id)))
  with check (exists (select 1 from public."Timetracking" tt
                      where tt.id = "_RolesToTimetracking"."B"
                        and public.user_can_access_site(tt.site_id)));

create policy "rolestotimetracking_delete_parent" on public."_RolesToTimetracking"
  for delete to authenticated
  using (exists (select 1 from public."Timetracking" tt
                 where tt.id = "_RolesToTimetracking"."B"
                   and public.user_can_access_site(tt.site_id)));

alter table public."_RolesToTimetracking" enable row level security;


-- =============================================================================
-- File -> Task."taskId" / SellProduct."sellProductId" / Errortracking."errortrackingId"
-- =============================================================================
-- Accesso se ALMENO UNO dei padri valorizzati e' accessibile.
--
-- SCOSTAMENTO MOTIVATO dal piano, che prevedeva "righe senza nessun padre:
-- solo is_superadmin()" su tutte le operazioni.
--
-- Il flusso reale di upload crea la riga File SENZA padre e la collega dopo:
--   app/api/files/upload/route.ts:44      insert con taskId/sellProductId/
--                                         errortrackingId tutti opzionali,
--                                         seguito da .select().single()
--   app/sites/[domain]/errortracking/actions/create-item.action.ts:93
--                                         update ... set errortrackingId = <nuovo>
--                                         in (fileIds gia' caricati)
--
-- Con orfani riservati al superadmin:
--   - l'insert passerebbe ma il .select().single() successivo restituirebbe
--     0 righe e l'upload andrebbe in errore per tutti tranne i superadmin;
--   - l'update di collegamento non troverebbe la riga (USING falso);
--   - app/api/files/[id]/route.ts, che fa delete().select("id") e interpreta
--     0 righe come deny RLS, risponderebbe 403 su ogni annullamento di upload.
--
-- Quindi le righe SENZA NESSUN PADRE sono accessibili a qualunque utente
-- autenticato. Non contengono dati di tenant (solo name, url, storage_path):
-- sul DB al 22.09.2026 sono 4 righe residue. Le righe CON un padre restano
-- sempre vincolate al tenant del padre.
--
-- Il fix strutturale e' aggiungere a File una colonna site_id (o created_by):
-- e' fuori dal perimetro di questa lavorazione ed e' segnalato nel report.
--
-- SellProduct e' fuori perimetro e ha gia' la RLS attiva: la sua policy si
-- applica anche dentro questa subquery, in aggiunta al controllo esplicito.

create policy "file_select_parent" on public."File"
  for select to authenticated
  using (
    exists (select 1 from public."Task" t
            where t.id = "File"."taskId"
              and public.user_can_access_site(t.site_id))
    or exists (select 1 from public."SellProduct" sp
               where sp.id = "File"."sellProductId"
                 and public.user_can_access_site(sp.site_id))
    or exists (select 1 from public."Errortracking" e
               where e.id = "File"."errortrackingId"
                 and public.user_can_access_site(e.site_id))
    or ("taskId" is null and "sellProductId" is null and "errortrackingId" is null)
  );

create policy "file_insert_parent" on public."File"
  for insert to authenticated
  with check (
    exists (select 1 from public."Task" t
            where t.id = "File"."taskId"
              and public.user_can_access_site(t.site_id))
    or exists (select 1 from public."SellProduct" sp
               where sp.id = "File"."sellProductId"
                 and public.user_can_access_site(sp.site_id))
    or exists (select 1 from public."Errortracking" e
               where e.id = "File"."errortrackingId"
                 and public.user_can_access_site(e.site_id))
    or ("taskId" is null and "sellProductId" is null and "errortrackingId" is null)
  );

create policy "file_update_parent" on public."File"
  for update to authenticated
  using (
    exists (select 1 from public."Task" t
            where t.id = "File"."taskId"
              and public.user_can_access_site(t.site_id))
    or exists (select 1 from public."SellProduct" sp
               where sp.id = "File"."sellProductId"
                 and public.user_can_access_site(sp.site_id))
    or exists (select 1 from public."Errortracking" e
               where e.id = "File"."errortrackingId"
                 and public.user_can_access_site(e.site_id))
    or ("taskId" is null and "sellProductId" is null and "errortrackingId" is null)
  )
  with check (
    exists (select 1 from public."Task" t
            where t.id = "File"."taskId"
              and public.user_can_access_site(t.site_id))
    or exists (select 1 from public."SellProduct" sp
               where sp.id = "File"."sellProductId"
                 and public.user_can_access_site(sp.site_id))
    or exists (select 1 from public."Errortracking" e
               where e.id = "File"."errortrackingId"
                 and public.user_can_access_site(e.site_id))
    or ("taskId" is null and "sellProductId" is null and "errortrackingId" is null)
  );

create policy "file_delete_parent" on public."File"
  for delete to authenticated
  using (
    exists (select 1 from public."Task" t
            where t.id = "File"."taskId"
              and public.user_can_access_site(t.site_id))
    or exists (select 1 from public."SellProduct" sp
               where sp.id = "File"."sellProductId"
                 and public.user_can_access_site(sp.site_id))
    or exists (select 1 from public."Errortracking" e
               where e.id = "File"."errortrackingId"
                 and public.user_can_access_site(e.site_id))
    or ("taskId" is null and "sellProductId" is null and "errortrackingId" is null)
  );

alter table public."File" enable row level security;


-- =============================================================================
-- _RolesToUser -> User."B"
-- =============================================================================
-- Tabella di join Prisma: A = Roles.id, B = User.id.
--
-- SELECT: l'utente B deve essere visibile secondo la stessa regola della policy
-- SELECT di User (ondata C). La condizione e' scritta per esteso invece di
-- affidarsi alla RLS di User, cosi' e' corretta anche nella finestra fra
-- l'ondata B e l'ondata C, quando User non ha ancora la RLS attiva.
--
-- SCOSTAMENTO MOTIVATO: il piano prevedeva scrittura solo is_superadmin().
-- Verificato allo Step 0 che le scritture arrivano anche dagli ADMIN, non solo
-- dai superadmin:
--   app/api/users/[userId]/company-roles/route.ts:67  403 se role non in
--                                                     (admin, superadmin);
--                                                     :137 insert, :196 delete
--   app/api/roles/[id]/route.ts:72                    delete
-- Con is_superadmin() secco, l'assegnazione dei ruoli aziendali da parte degli
-- admin si romperebbe.
--
-- I Roles qui NON sono privilegi: sono mansioni aziendali (CNC, Qualita',
-- Montaggio, Imballaggio, AVOR, Posa, Pittura, Logistica...). Il privilegio
-- applicativo e' User.role, che non passa da questa tabella. Il criterio e'
-- quindi "posso scrivere il collegamento di un utente che gia' vedo".

create policy "rolestouser_select_visible_user" on public."_RolesToUser"
  for select to authenticated
  using (exists (
    select 1 from public."User" u
    where u.id = "_RolesToUser"."B"
      and (
        u.auth_id = (select auth.uid())
        or public.is_superadmin()
        or public.user_shares_tenancy_with(u.auth_id)
      )
  ));

create policy "rolestouser_insert_visible_user" on public."_RolesToUser"
  for insert to authenticated
  with check (exists (
    select 1 from public."User" u
    where u.id = "_RolesToUser"."B"
      and (public.is_superadmin() or public.user_shares_tenancy_with(u.auth_id))
  ));

create policy "rolestouser_update_visible_user" on public."_RolesToUser"
  for update to authenticated
  using (exists (
    select 1 from public."User" u
    where u.id = "_RolesToUser"."B"
      and (public.is_superadmin() or public.user_shares_tenancy_with(u.auth_id))
  ))
  with check (exists (
    select 1 from public."User" u
    where u.id = "_RolesToUser"."B"
      and (public.is_superadmin() or public.user_shares_tenancy_with(u.auth_id))
  ));

create policy "rolestouser_delete_visible_user" on public."_RolesToUser"
  for delete to authenticated
  using (exists (
    select 1 from public."User" u
    where u.id = "_RolesToUser"."B"
      and (public.is_superadmin() or public.user_shares_tenancy_with(u.auth_id))
  ));

alter table public."_RolesToUser" enable row level security;


-- =============================================================================
-- Checklist_item — nessuna FK, 0 righe, nessun accesso nel codice
-- =============================================================================
-- Non esiste modo di legarla a un tenant. Tutto riservato al superadmin.

create policy "checklist_item_all_superadmin" on public."Checklist_item"
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public."Checklist_item" enable row level security;
