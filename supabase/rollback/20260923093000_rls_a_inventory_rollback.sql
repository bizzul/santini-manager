-- =============================================================================
-- ROLLBACK — Ondata A: inventory_*
-- =============================================================================
-- Spegne la RLS e rimuove le policy create dalla migration gemella.
-- Dopo il rollback queste tabelle tornano leggibili e scrivibili con la chiave
-- anon da chiunque: usarlo solo per sbloccare un incidente.
-- =============================================================================

-- Le policy inventory_*_site delle prime cinque tabelle appartengono alla
-- migration 20260923091000: qui si spegne solo la RLS. Per rimuovere anche
-- quelle policy usare 20260923091000_rls_fix_policy_errate_rollback.sql.
alter table public.inventory_categories    disable row level security;
alter table public.inventory_items         disable row level security;
alter table public.inventory_item_variants disable row level security;
alter table public.inventory_suppliers     disable row level security;
alter table public.inventory_warehouses    disable row level security;

alter table public.inventory_subcategory_images disable row level security;
drop policy if exists "inventory_subcategory_images_select_site" on public.inventory_subcategory_images;
drop policy if exists "inventory_subcategory_images_insert_site" on public.inventory_subcategory_images;
drop policy if exists "inventory_subcategory_images_update_site" on public.inventory_subcategory_images;
drop policy if exists "inventory_subcategory_images_delete_site" on public.inventory_subcategory_images;

