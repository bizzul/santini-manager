-- =============================================================================
-- RLS hardening — Ondata C: user_sites, user_organizations
-- =============================================================================
-- Sono le due tabelle che definiscono chi vede cosa. Le policy attuali
-- ("proprie righe" su tutte e quattro le operazioni) hanno due problemi:
--
--   1. la SELECT limitata alle proprie righe impedisce a un admin di vedere
--      i colleghi (elenco collaboratori, dropdown assegnatari);
--   2. la INSERT "auth.uid() = user_id" permette a QUALSIASI utente
--      autenticato di auto-assegnarsi a UNO SPAZIO O UN'ORGANIZZAZIONE
--      QUALSIASI, semplicemente inserendo una riga con il proprio user_id.
--      E' il buco piu' grave di questa coppia di tabelle.
--
-- Le policy vecchie vengono droppate e riscritte.
-- Nessun dato viene modificato.
-- =============================================================================


-- =============================================================================
-- user_sites
-- =============================================================================
drop policy if exists "Users can view their own site relationships"   on public.user_sites;
drop policy if exists "Users can insert their own site relationships" on public.user_sites;
drop policy if exists "Users can update their own site relationships" on public.user_sites;
drop policy if exists "Users can delete their own site relationships" on public.user_sites;

-- SELECT: le proprie righe (serve ad auth/callback, invitation-handler,
-- getUserSites()) piu' tutte le righe degli spazi a cui ho accesso, cosi' gli
-- admin vedono i colleghi.
-- user_can_access_site() e' SECURITY DEFINER e legge user_sites: bypassa la
-- RLS, quindi non c'e' ricorsione.
create policy "user_sites_select_own_or_site" on public.user_sites
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.user_can_access_site(site_id)
  );

-- INSERT: solo admin dello spazio o superadmin. Chiude l'auto-assegnazione.
-- Percorsi verificati allo Step 0, entrambi compatibili:
--   app/sites/[domain]/collaborators/actions.ts::addCollaboratorToSite /
--     inviteCollaborator  -> gated da checkAdminAccess() (admin dello spazio)
--   app/(administration)/administration/sites/actions.ts::duplicateSite
--     -> gated da canAccessAllOrganizations (superadmin)
create policy "user_sites_insert_site_admin" on public.user_sites
  for insert to authenticated
  with check (
    public.is_superadmin()
    or public.user_is_site_admin(site_id)
  );

-- UPDATE/DELETE: la propria riga (un utente puo' sganciarsi da uno spazio)
-- oppure un admin di quello spazio.
create policy "user_sites_update_own_or_site_admin" on public.user_sites
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_superadmin()
    or public.user_is_site_admin(site_id)
  )
  with check (
    public.is_superadmin()
    or public.user_is_site_admin(site_id)
  );

create policy "user_sites_delete_own_or_site_admin" on public.user_sites
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_superadmin()
    or public.user_is_site_admin(site_id)
  );

alter table public.user_sites enable row level security;


-- =============================================================================
-- user_organizations
-- =============================================================================
drop policy if exists "Users can view their own organization relationships"   on public.user_organizations;
drop policy if exists "Users can insert their own organization relationships" on public.user_organizations;
drop policy if exists "Users can update their own organization relationships" on public.user_organizations;
drop policy if exists "Users can delete their own organization relationships" on public.user_organizations;
drop policy if exists "Superadmins can manage all organization relationships" on public.user_organizations;

-- SELECT: le proprie righe piu' quelle delle organizzazioni di cui faccio
-- parte. Serve a getAvailableUsersForSite(), che legge le righe di
-- un'organizzazione per proporre i collaboratori da aggiungere.
-- user_in_organization() e' SECURITY DEFINER: senza di lei questa policy
-- interrogherebbe user_organizations dall'interno di una policy su
-- user_organizations, andando in ricorsione infinita.
create policy "user_organizations_select_own_or_org" on public.user_organizations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_superadmin()
    or public.user_in_organization(organization_id)
  );

-- INSERT: chiude l'auto-assegnazione a un'organizzazione qualsiasi.
--
-- SCOSTAMENTO MOTIVATO dal piano, che prevedeva is_superadmin() secco.
-- Verificato allo Step 0: app/sites/[domain]/collaborators/actions.ts:606
-- inserisce in user_organizations con il CLIENT DI SESSIONE quando un ADMIN
-- invita un collaboratore. checkAdminAccess() (:85) richiede che l'admin
-- appartenga gia' a quell'organizzazione, quindi la condizione qui sotto
-- e' esattamente il gate applicativo esistente.
create policy "user_organizations_insert_admin_of_org" on public.user_organizations
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (public.user_is_admin() and public.user_in_organization(organization_id))
  );

create policy "user_organizations_update_admin_of_org" on public.user_organizations
  for update to authenticated
  using (
    public.is_superadmin()
    or (public.user_is_admin() and public.user_in_organization(organization_id))
  )
  with check (
    public.is_superadmin()
    or (public.user_is_admin() and public.user_in_organization(organization_id))
  );

create policy "user_organizations_delete_own_or_admin" on public.user_organizations
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_superadmin()
    or (public.user_is_admin() and public.user_in_organization(organization_id))
  );

alter table public.user_organizations enable row level security;
