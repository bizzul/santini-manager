-- ==========================================
--  ROLLBACK: Unified Inventory Migration
--  Run this to undo the unified inventory migration
-- ==========================================

-- Drop RLS policies
drop policy if exists "inventory_units_select" on public.inventory_units;
drop policy if exists "inventory_categories_select" on public.inventory_categories;
drop policy if exists "inventory_categories_insert" on public.inventory_categories;
drop policy if exists "inventory_categories_update" on public.inventory_categories;
drop policy if exists "inventory_categories_delete" on public.inventory_categories;
drop policy if exists "inventory_suppliers_select" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_insert" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_update" on public.inventory_suppliers;
drop policy if exists "inventory_suppliers_delete" on public.inventory_suppliers;
drop policy if exists "inventory_warehouses_select" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_insert" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_update" on public.inventory_warehouses;
drop policy if exists "inventory_warehouses_delete" on public.inventory_warehouses;
drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_insert" on public.inventory_items;
drop policy if exists "inventory_items_update" on public.inventory_items;
drop policy if exists "inventory_items_delete" on public.inventory_items;
drop policy if exists "inventory_variants_select" on public.inventory_item_variants;
drop policy if exists "inventory_variants_insert" on public.inventory_item_variants;
drop policy if exists "inventory_variants_update" on public.inventory_item_variants;
drop policy if exists "inventory_variants_delete" on public.inventory_item_variants;
drop policy if exists "inventory_movements_select" on public.inventory_stock_movements;
drop policy if exists "inventory_movements_insert" on public.inventory_stock_movements;

-- Drop view first (it depends on movements table)
drop view if exists public.inventory_stock;

-- Drop triggers
drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
drop trigger if exists trg_inventory_variants_updated_at on public.inventory_item_variants;
drop trigger if exists trg_inventory_categories_updated_at on public.inventory_categories;
drop trigger if exists trg_inventory_suppliers_updated_at on public.inventory_suppliers;
drop trigger if exists trg_inventory_warehouses_updated_at on public.inventory_warehouses;

-- Note: Don't drop set_updated_at function as it might be used elsewhere

-- Drop tables in correct order (respecting foreign key dependencies)
drop table if exists public.inventory_stock_movements cascade;
drop table if exists public.inventory_item_variants cascade;
drop table if exists public.inventory_items cascade;
drop table if exists public.inventory_warehouses cascade;
drop table if exists public.inventory_suppliers cascade;
drop table if exists public.inventory_categories cascade;
drop table if exists public.inventory_units cascade;

-- The original Product, Product_category, and Supplier tables remain intact
-- as the migration did not modify them

-- ==========================================
-- NOTE: This rollback will delete all data
-- in the new inventory tables. The original
-- Product, Product_category, and Supplier
-- tables are preserved with their data.
-- ==========================================

