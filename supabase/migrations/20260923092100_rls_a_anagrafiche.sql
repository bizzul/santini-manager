-- =============================================================================
-- RLS hardening — Ondata A: Client, Supplier, Product, Product_category, Department
-- =============================================================================
-- Righe al 22.09.2026: Client 620, Supplier 67, Product 95,
-- Product_category 33, Department 0. Nessuna con site_id NULL.
-- Pattern: prima le policy, poi enable row level security, nella stessa migration.
-- Tutte le policy sono "to authenticated": il ruolo anon non compare mai, quindi
-- senza login queste tabelle restituiscono 0 righe e rifiutano ogni scrittura.
--
-- Nessun dato viene modificato.
-- =============================================================================

-- Client
-- ECCEZIONE: Client ha gia' le 4 policy corrette (client_*_site_access,
-- to authenticated, site_id is not null and user_can_access_site(site_id)),
-- create dalla baseline e rimaste inerti perche' la RLS era spenta.
-- Verificate sul remoto il 22.09.2026: sono equivalenti al pattern standard.
-- Non vengono duplicate: qui si attiva soltanto la RLS.
alter table public."Client" enable row level security;

-- Supplier
create policy "supplier_select_site" on public."Supplier"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "supplier_insert_site" on public."Supplier"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "supplier_update_site" on public."Supplier"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "supplier_delete_site" on public."Supplier"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Supplier" enable row level security;

-- Product
create policy "product_select_site" on public."Product"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "product_insert_site" on public."Product"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "product_update_site" on public."Product"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "product_delete_site" on public."Product"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Product" enable row level security;

-- Product_category
create policy "product_category_select_site" on public."Product_category"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "product_category_insert_site" on public."Product_category"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "product_category_update_site" on public."Product_category"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "product_category_delete_site" on public."Product_category"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Product_category" enable row level security;

-- Department
create policy "department_select_site" on public."Department"
  for select to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

create policy "department_insert_site" on public."Department"
  for insert to authenticated
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "department_update_site" on public."Department"
  for update to authenticated
  using (site_id is not null and public.user_can_access_site(site_id))
  with check (site_id is not null and public.user_can_access_site(site_id));

create policy "department_delete_site" on public."Department"
  for delete to authenticated
  using (site_id is not null and public.user_can_access_site(site_id));

alter table public."Department" enable row level security;

