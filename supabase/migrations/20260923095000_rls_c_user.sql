-- =============================================================================
-- RLS hardening — Ondata C: User
-- =============================================================================
-- User e' in supabase_realtime: dopo la RLS ogni client riceve solo le righe
-- degli utenti che puo' vedere.
--
-- VISIBILITA': sé stesso, oppure superadmin, oppure un utente con cui si
-- condivide un'organizzazione o un sito (public.user_shares_tenancy_with()).
--
-- SCOSTAMENTO MOTIVATO dal piano, che prevedeva per la SELECT solo il ramo
-- "condivide almeno un sito con me" e per INSERT/DELETE solo is_superadmin().
-- Verificato allo Step 0:
--
--   1. app/sites/[domain]/collaborators/actions.ts::getAvailableUsersForSite()
--      propone gli utenti DELL'ORGANIZZAZIONE non ancora assegnati al sito.
--      Col solo ramo "sito" quella lista sarebbe sempre vuota e non si
--      potrebbero piu' aggiungere collaboratori. Serve il ramo organizzazione.
--
--   2. inviteCollaborator() (stesso file, :584) fa l'INSERT su "User" con il
--      CLIENT DI SESSIONE, non con il service role, ed e' gated da
--      checkAdminAccess() -> admin del sito. Con is_superadmin() secco
--      l'invito di un collaboratore si romperebbe.
--      Al momento dell'insert il nuovo utente non ha ancora ne' user_sites ne'
--      user_organizations, quindi nessun criterio basato sulla tenancy puo'
--      essere vero: si usa user_is_admin().
--
--   3. app/api/users/[userId]/delete/route.ts:34 fa il DELETE con il client di
--      sessione, gated da (admin | superadmin), e protegge in codice i target
--      superadmin. Stesso ragionamento del punto 2.
--
-- Nessun dato viene modificato.
-- =============================================================================

create policy "user_select_self_or_tenancy" on public."User"
  for select to authenticated
  using (
    auth_id = (select auth.uid())
    or public.is_superadmin()
    or public.user_shares_tenancy_with(auth_id)
  );

-- INSERT: superadmin, oppure un admin che sta invitando un collaboratore.
create policy "user_insert_admin" on public."User"
  for insert to authenticated
  with check (public.user_is_admin());

-- UPDATE: sé stesso (complete-signup, profilo), superadmin, oppure un admin
-- che condivide organizzazione o sito con l'utente modificato.
create policy "user_update_self_or_admin" on public."User"
  for update to authenticated
  using (
    auth_id = (select auth.uid())
    or public.is_superadmin()
    or (public.user_is_admin() and public.user_shares_tenancy_with(auth_id))
  )
  with check (
    auth_id = (select auth.uid())
    or public.is_superadmin()
    or (public.user_is_admin() and public.user_shares_tenancy_with(auth_id))
  );

-- DELETE: superadmin, oppure un admin che condivide tenancy con il target.
-- La protezione "solo i superadmin cancellano i superadmin" resta applicativa
-- (app/api/users/[userId]/delete/route.ts:64).
create policy "user_delete_admin" on public."User"
  for delete to authenticated
  using (
    public.is_superadmin()
    or (public.user_is_admin() and public.user_shares_tenancy_with(auth_id))
  );

alter table public."User" enable row level security;
