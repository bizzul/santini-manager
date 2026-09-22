-- =============================================================================
-- RLS hardening — Ondata C: sites, organizations
-- =============================================================================
-- VERIFICA PRELIMINARE SUPERATA (condizione di stop dello Step 5):
-- la risoluzione dominio -> sito NON usa il client di sessione.
--   lib/site-context.ts -> lib/fetchers.ts::getSiteData() legge "sites" con
--   createServiceClient(), dentro unstable_cache.
--   middleware.ts -> proxy.ts -> utils/supabase/middleware.ts::updateSession()
--   fa solo auth.getUser()/getSession(), non legge nessuna tabella.
-- Attivare la RLS su sites non rompe quindi la risoluzione del dominio, ne'
-- prima ne' dopo il login.
--
-- Verificato anche components/sites-select/sites-grid.tsx: legge "User" con il
-- service role e user_site_select_preferences (fuori perimetro, RLS gia'
-- attiva) con la sessione.
--
-- Nessun dato viene modificato.
-- =============================================================================


-- =============================================================================
-- sites
-- =============================================================================
-- user_can_access_site() e' SECURITY DEFINER e legge sites al suo interno:
-- bypassa la RLS, quindi non c'e' ricorsione.

create policy "sites_select_access" on public.sites
  for select to authenticated
  using (public.user_can_access_site(id));

create policy "sites_update_site_admin" on public.sites
  for update to authenticated
  using (public.user_is_site_admin(id))
  with check (public.user_is_site_admin(id));

create policy "sites_insert_superadmin" on public.sites
  for insert to authenticated
  with check (public.is_superadmin());

create policy "sites_delete_superadmin" on public.sites
  for delete to authenticated
  using (public.is_superadmin());

alter table public.sites enable row level security;


-- =============================================================================
-- organizations
-- =============================================================================
-- SELECT: membro dell'organizzazione (user_in_organization(), SECURITY DEFINER
-- per non ricorrere su user_organizations), oppure accesso ad almeno un sito
-- dell'organizzazione, oppure superadmin.
--
-- Il secondo ramo serve a components/complete-signup.tsx, che per un invitato
-- legato solo a user_sites risale da sites.organization_id ai nomi delle
-- organizzazioni.
--
-- Scrittura: solo superadmin. Verificato allo Step 0 che gli unici percorsi di
-- scrittura attivi sono in app/(administration)/administration/actions.ts
-- (createOrganizationAndInviteUser :248, duplicate :421, update :490,
-- delete :511), tutti gia' gated da canAccessAllOrganizations.
-- app/api/organizations/create|join/route.ts scrivono anche loro, ma
-- interrogano prima la tabella "tenants", che NON ESISTE piu' nello schema:
-- sono codice morto.

create policy "organizations_select_member_or_site" on public.organizations
  for select to authenticated
  using (
    public.is_superadmin()
    or public.user_in_organization(id)
    or exists (
      select 1 from public.sites s
      where s.organization_id = organizations.id
        and public.user_can_access_site(s.id)
    )
  );

create policy "organizations_insert_superadmin" on public.organizations
  for insert to authenticated
  with check (public.is_superadmin());

create policy "organizations_update_superadmin" on public.organizations
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "organizations_delete_superadmin" on public.organizations
  for delete to authenticated
  using (public.is_superadmin());

alter table public.organizations enable row level security;
