-- =============================================================================
-- ROLLBACK di 20260923091000_rls_fix_policy_errate.sql
-- =============================================================================
-- Ripristina lo stato del 22.09.2026, policy errate incluse.
--
-- ATTENZIONE: dopo questo rollback attendance_entries torna leggibile SENZA
-- LOGIN da chiunque (SELECT true per il ruolo public) e le policy inventory_*
-- tornano tautologiche. Usarlo solo per sbloccare un incidente, non come stato
-- di riposo.
-- =============================================================================

-- 1. attendance_entries
drop policy if exists "attendance_entries_select_site"  on public.attendance_entries;
drop policy if exists "attendance_entries_insert_site"  on public.attendance_entries;
drop policy if exists "attendance_entries_update_site"  on public.attendance_entries;
drop policy if exists "attendance_entries_delete_admin" on public.attendance_entries;

create policy "Users can view attendance entries for their site" on public.attendance_entries
  for select using (true);
create policy "Authenticated users can insert attendance entries" on public.attendance_entries
  for insert with check (auth.uid() is not null);
create policy "Authenticated users can update attendance entries" on public.attendance_entries
  for update using (auth.uid() is not null);
create policy "Authenticated users can delete attendance entries" on public.attendance_entries
  for delete using (auth.uid() is not null);

-- 2. inventory_*
drop policy if exists "inventory_categories_select_site" on public.inventory_categories;
drop policy if exists "inventory_categories_insert_site" on public.inventory_categories;
drop policy if exists "inventory_categories_update_site" on public.inventory_categories;
drop policy if exists "inventory_categories_delete_site" on public.inventory_categories;

create policy "inventory_categories_select" on public.inventory_categories
  for select using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_categories_insert" on public.inventory_categories
  for insert with check (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_categories_update" on public.inventory_categories
  for update using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_categories_delete" on public.inventory_categories
  for delete using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));

drop policy if exists "inventory_items_select_site" on public.inventory_items;
drop policy if exists "inventory_items_insert_site" on public.inventory_items;
drop policy if exists "inventory_items_update_site" on public.inventory_items;
drop policy if exists "inventory_items_delete_site" on public.inventory_items;

create policy "inventory_items_select" on public.inventory_items
  for select using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_items_insert" on public.inventory_items
  for insert with check (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_items_update" on public.inventory_items
  for update using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_items_delete" on public.inventory_items
  for delete using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));

drop policy if exists "inventory_item_variants_select_site" on public.inventory_item_variants;
drop policy if exists "inventory_item_variants_insert_site" on public.inventory_item_variants;
drop policy if exists "inventory_item_variants_update_site" on public.inventory_item_variants;
drop policy if exists "inventory_item_variants_delete_site" on public.inventory_item_variants;

create policy "inventory_variants_select" on public.inventory_item_variants
  for select using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_variants_insert" on public.inventory_item_variants
  for insert with check (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_variants_update" on public.inventory_item_variants
  for update using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_variants_delete" on public.inventory_item_variants
  for delete using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));

drop policy if exists "inventory_suppliers_select_site" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_insert_site" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_update_site" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_delete_site" on public.inventory_suppliers;

create policy "inventory_suppliers_select" on public.inventory_suppliers
  for select using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_suppliers_insert" on public.inventory_suppliers
  for insert with check (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_suppliers_update" on public.inventory_suppliers
  for update using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_suppliers_delete" on public.inventory_suppliers
  for delete using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));

drop policy if exists "inventory_warehouses_select_site" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_insert_site" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_update_site" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_delete_site" on public.inventory_warehouses;

create policy "inventory_warehouses_select" on public.inventory_warehouses
  for select using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_warehouses_insert" on public.inventory_warehouses
  for insert with check (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_warehouses_update" on public.inventory_warehouses
  for update using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));
create policy "inventory_warehouses_delete" on public.inventory_warehouses
  for delete using (exists (select 1 from public.user_sites us where us.user_id = auth.uid() and us.site_id = us.site_id));

-- 3. sites
create policy "superadmin_can_access_all_sites" on public.sites
  for all using (auth.role() = 'superadmin'::text);
