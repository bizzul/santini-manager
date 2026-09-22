-- =============================================================================
-- ROLLBACK — Ondata A: Client, Supplier, Product, Product_category, Department
-- =============================================================================
-- Spegne la RLS e rimuove le policy create dalla migration gemella.
-- Dopo il rollback queste tabelle tornano leggibili e scrivibili con la chiave
-- anon da chiunque: usarlo solo per sbloccare un incidente.
-- =============================================================================

-- Client: le policy client_*_site_access sono preesistenti alla lavorazione
-- e NON vanno droppate. Si spegne solo la RLS.
alter table public."Client" disable row level security;

-- Supplier
alter table public."Supplier" disable row level security;
drop policy if exists "supplier_select_site" on public."Supplier";
drop policy if exists "supplier_insert_site" on public."Supplier";
drop policy if exists "supplier_update_site" on public."Supplier";
drop policy if exists "supplier_delete_site" on public."Supplier";

-- Product
alter table public."Product" disable row level security;
drop policy if exists "product_select_site" on public."Product";
drop policy if exists "product_insert_site" on public."Product";
drop policy if exists "product_update_site" on public."Product";
drop policy if exists "product_delete_site" on public."Product";

-- Product_category
alter table public."Product_category" disable row level security;
drop policy if exists "product_category_select_site" on public."Product_category";
drop policy if exists "product_category_insert_site" on public."Product_category";
drop policy if exists "product_category_update_site" on public."Product_category";
drop policy if exists "product_category_delete_site" on public."Product_category";

-- Department
alter table public."Department" disable row level security;
drop policy if exists "department_select_site" on public."Department";
drop policy if exists "department_insert_site" on public."Department";
drop policy if exists "department_update_site" on public."Department";
drop policy if exists "department_delete_site" on public."Department";

