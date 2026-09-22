-- =============================================================================
-- RLS hardening — Ondata C: audit_logs, Roles, inventory_units
-- =============================================================================
-- Tre tabelle senza site_id proprio: una di audit, due globali.
-- Nessun dato viene modificato.
-- =============================================================================


-- =============================================================================
-- audit_logs
-- =============================================================================
-- 0 righe e NESSUN accesso nel codice (nessun .from("audit_logs") nel repo).
-- Non ha site_id. user_id e' di tipo TEXT, non uuid: il confronto con
-- auth.uid() richiede il cast esplicito.
--
-- Lettura riservata al superadmin. Scrittura consentita solo per le proprie
-- righe, cosi' un eventuale logging lato sessione continuerebbe a funzionare.
-- Nessuna policy per UPDATE e DELETE: senza policy l'operazione e' negata,
-- ed e' il comportamento voluto per un log di audit.

create policy "audit_logs_select_superadmin" on public.audit_logs
  for select to authenticated
  using (public.is_superadmin());

create policy "audit_logs_insert_self" on public.audit_logs
  for insert to authenticated
  with check (user_id = (select auth.uid())::text);

alter table public.audit_logs enable row level security;


-- =============================================================================
-- Roles
-- =============================================================================
-- 17 righe, tutte con site_id NULL: sono mansioni aziendali globali
-- (CNC, Qualita', Montaggio, Imballaggio, AVOR, Posa, Pittura, Logistica...),
-- non privilegi. Il privilegio applicativo e' User.role.
--
-- SELECT: i ruoli globali sono visibili a tutti gli autenticati; quelli legati
-- a uno spazio solo a chi accede a quello spazio.
--
-- SCOSTAMENTO MOTIVATO dal piano, che prevedeva scrittura solo is_superadmin().
-- Verificato allo Step 0 che la creazione e la modifica dei ruoli aziendali
-- sono consentite agli ADMIN, non solo ai superadmin:
--   app/api/roles/route.ts:46          403 se role non in (admin, superadmin)
--   app/api/roles/[id]/route.ts:20,:64 idem, su PUT e DELETE
-- Con is_superadmin() secco la gestione dei ruoli aziendali si romperebbe per
-- gli admin, che e' chi la usa davvero.
--
-- Effetto collaterale noto: un admin puo' creare un ruolo globale, quindi
-- visibile anche agli altri spazi. E' il comportamento odierno. Per stringere
-- a soli superadmin va cambiato prima il gate applicativo.

create policy "roles_select_global_or_site" on public."Roles"
  for select to authenticated
  using (site_id is null or public.user_can_access_site(site_id));

create policy "roles_insert_admin" on public."Roles"
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (site_id is null and public.user_is_admin())
    or (site_id is not null and public.user_is_site_admin(site_id))
  );

create policy "roles_update_admin" on public."Roles"
  for update to authenticated
  using (
    public.is_superadmin()
    or (site_id is null and public.user_is_admin())
    or (site_id is not null and public.user_is_site_admin(site_id))
  )
  with check (
    public.is_superadmin()
    or (site_id is null and public.user_is_admin())
    or (site_id is not null and public.user_is_site_admin(site_id))
  );

create policy "roles_delete_admin" on public."Roles"
  for delete to authenticated
  using (
    public.is_superadmin()
    or (site_id is null and public.user_is_admin())
    or (site_id is not null and public.user_is_site_admin(site_id))
  );

alter table public."Roles" enable row level security;


-- =============================================================================
-- inventory_units
-- =============================================================================
-- 8 righe, tabella globale senza site_id (unita' di misura).
-- La policy attuale e' SELECT true per il ruolo public: leggibile anche senza
-- login. Viene sostituita con SELECT to authenticated using (true).
-- Scrittura solo superadmin: nel codice non esiste nessuna scrittura.

drop policy if exists "inventory_units_select" on public.inventory_units;

create policy "inventory_units_select_authenticated" on public.inventory_units
  for select to authenticated
  using (true);

create policy "inventory_units_insert_superadmin" on public.inventory_units
  for insert to authenticated
  with check (public.is_superadmin());

create policy "inventory_units_update_superadmin" on public.inventory_units
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "inventory_units_delete_superadmin" on public.inventory_units
  for delete to authenticated
  using (public.is_superadmin());

alter table public.inventory_units enable row level security;
