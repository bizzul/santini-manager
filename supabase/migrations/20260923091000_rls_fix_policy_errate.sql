-- =============================================================================
-- RLS hardening — Step 2: correzione delle policy errate
-- =============================================================================
-- Tre gruppi, nessuna attivazione di RLS tranne dove era gia' attiva:
--
--   1. attendance_entries  — RLS GIA' ATTIVA con policy sbagliate. Fix urgente:
--                            oggi SELECT e' "true" per il ruolo public, quindi
--                            le presenze di tutti gli spazi sono leggibili
--                            ANCHE SENZA LOGIN.
--   2. inventory_*          — 4 policy ciascuna con la condizione tautologica
--                            us.site_id = us.site_id (sempre vera). Sostituite.
--                            La RLS resta SPENTA qui: si attiva nell'ondata A.
--   3. sites                — drop della policy inutile auth.role()='superadmin'
--                            (mai vera). Le policy nuove arrivano nell'ondata C.
--
-- Nessun dato viene modificato.
-- =============================================================================


-- =============================================================================
-- 1. attendance_entries
-- =============================================================================
-- DELETE affidata a user_is_site_admin(): rispecchia il gate gia' presente in
-- app/api/sites/[domain]/attendance/route.ts, dove sia POST sia DELETE passano
-- da isAdminOrSuperadmin() (lib/permissions.ts:14 — role in 'admin','superadmin',
-- gli stessi di user_is_site_admin()). Il collaboratore non cancella la propria
-- presenza: lo fa l'admin dello spazio.
--
-- INSERT/UPDATE restano su user_can_access_site(): la POST fa un upsert e il
-- gate admin e' gia' applicato in codice.
--
-- La GET della stessa route usa il service role, quindi la lettura della pagina
-- Presenze non cambia comportamento.

drop policy if exists "Users can view attendance entries for their site" on public.attendance_entries;
drop policy if exists "Authenticated users can insert attendance entries"  on public.attendance_entries;
drop policy if exists "Authenticated users can update attendance entries"  on public.attendance_entries;
drop policy if exists "Authenticated users can delete attendance entries"  on public.attendance_entries;

create policy "attendance_entries_select_site" on public.attendance_entries
  for select to authenticated
  using (public.user_can_access_site(site_id));

create policy "attendance_entries_insert_site" on public.attendance_entries
  for insert to authenticated
  with check (public.user_can_access_site(site_id));

create policy "attendance_entries_update_site" on public.attendance_entries
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));

create policy "attendance_entries_delete_admin" on public.attendance_entries
  for delete to authenticated
  using (public.user_is_site_admin(site_id));


-- =============================================================================
-- 2. inventory_* — policy con condizione tautologica
-- =============================================================================
-- La condizione attuale e':
--   exists (select 1 from user_sites us
--           where us.user_id = auth.uid() and us.site_id = us.site_id)
-- cioe' "l'utente ha almeno un user_sites qualsiasi": non filtra per sito.
-- Viene sostituita con user_can_access_site(site_id) su USING e WITH CHECK.
--
-- La RLS su queste tabelle NON viene attivata qui: lo fa
-- 20260923093000_rls_a_inventory.sql. Fino ad allora le policy restano inerti.

-- inventory_categories
drop policy if exists "inventory_categories_select" on public.inventory_categories;
drop policy if exists "inventory_categories_insert" on public.inventory_categories;
drop policy if exists "inventory_categories_update" on public.inventory_categories;
drop policy if exists "inventory_categories_delete" on public.inventory_categories;

create policy "inventory_categories_select_site" on public.inventory_categories
  for select to authenticated using (public.user_can_access_site(site_id));
create policy "inventory_categories_insert_site" on public.inventory_categories
  for insert to authenticated with check (public.user_can_access_site(site_id));
create policy "inventory_categories_update_site" on public.inventory_categories
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));
create policy "inventory_categories_delete_site" on public.inventory_categories
  for delete to authenticated using (public.user_can_access_site(site_id));

-- inventory_items
drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_insert" on public.inventory_items;
drop policy if exists "inventory_items_update" on public.inventory_items;
drop policy if exists "inventory_items_delete" on public.inventory_items;

create policy "inventory_items_select_site" on public.inventory_items
  for select to authenticated using (public.user_can_access_site(site_id));
create policy "inventory_items_insert_site" on public.inventory_items
  for insert to authenticated with check (public.user_can_access_site(site_id));
create policy "inventory_items_update_site" on public.inventory_items
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));
create policy "inventory_items_delete_site" on public.inventory_items
  for delete to authenticated using (public.user_can_access_site(site_id));

-- inventory_item_variants (le policy si chiamano inventory_variants_*)
drop policy if exists "inventory_variants_select" on public.inventory_item_variants;
drop policy if exists "inventory_variants_insert" on public.inventory_item_variants;
drop policy if exists "inventory_variants_update" on public.inventory_item_variants;
drop policy if exists "inventory_variants_delete" on public.inventory_item_variants;

create policy "inventory_item_variants_select_site" on public.inventory_item_variants
  for select to authenticated using (public.user_can_access_site(site_id));
create policy "inventory_item_variants_insert_site" on public.inventory_item_variants
  for insert to authenticated with check (public.user_can_access_site(site_id));
create policy "inventory_item_variants_update_site" on public.inventory_item_variants
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));
create policy "inventory_item_variants_delete_site" on public.inventory_item_variants
  for delete to authenticated using (public.user_can_access_site(site_id));

-- inventory_suppliers
drop policy if exists "inventory_suppliers_select" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_insert" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_update" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_delete" on public.inventory_suppliers;

create policy "inventory_suppliers_select_site" on public.inventory_suppliers
  for select to authenticated using (public.user_can_access_site(site_id));
create policy "inventory_suppliers_insert_site" on public.inventory_suppliers
  for insert to authenticated with check (public.user_can_access_site(site_id));
create policy "inventory_suppliers_update_site" on public.inventory_suppliers
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));
create policy "inventory_suppliers_delete_site" on public.inventory_suppliers
  for delete to authenticated using (public.user_can_access_site(site_id));

-- inventory_warehouses
drop policy if exists "inventory_warehouses_select" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_insert" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_update" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_delete" on public.inventory_warehouses;

create policy "inventory_warehouses_select_site" on public.inventory_warehouses
  for select to authenticated using (public.user_can_access_site(site_id));
create policy "inventory_warehouses_insert_site" on public.inventory_warehouses
  for insert to authenticated with check (public.user_can_access_site(site_id));
create policy "inventory_warehouses_update_site" on public.inventory_warehouses
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));
create policy "inventory_warehouses_delete_site" on public.inventory_warehouses
  for delete to authenticated using (public.user_can_access_site(site_id));


-- =============================================================================
-- 3. sites — rimozione della policy inerte
-- =============================================================================
-- auth.role() restituisce 'anon' o 'authenticated', mai 'superadmin':
-- la condizione non e' mai vera. Le policy vere arrivano con l'ondata C
-- (20260923095100_rls_c_sites.sql). La RLS su sites resta spenta fino ad allora.

drop policy if exists "superadmin_can_access_all_sites" on public.sites;
