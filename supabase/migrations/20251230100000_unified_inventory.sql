-- ==========================================
--  Supabase migration: Unified Inventory
--  (Stock items, not sellproducts)
-- ==========================================

-- Needed for gen_random_uuid() on Supabase
create extension if not exists pgcrypto;

-- ------------------------------------------
-- Units of measure
-- ------------------------------------------
create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  code text not null,                 -- e.g. "pz", "kg", "g", "l", "ml", "m", "m2", "m3"
  name text not null,                 -- e.g. "Pezzi", "Kilogrammo"
  unit_type text not null,            -- e.g. "unit", "weight", "volume", "length", "area"
  base_unit_id uuid null references public.inventory_units(id) on delete set null,
  multiplier numeric null,            -- conversion to base (e.g. g -> kg = 0.001)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_units_code_uk unique (code),
  constraint inventory_units_unit_type_ck check (unit_type in ('unit','weight','volume','length','area','other')),
  constraint inventory_units_multiplier_ck check (multiplier is null or multiplier > 0)
);

-- Seed minimal units (safe to re-run)
insert into public.inventory_units (code, name, unit_type)
values
  ('pz', 'Pezzi', 'unit'),
  ('kg', 'Kilogrammo', 'weight'),
  ('g',  'Grammo', 'weight'),
  ('l',  'Litro', 'volume'),
  ('ml', 'Millilitro', 'volume'),
  ('m',  'Metro', 'length'),
  ('m2', 'Metro quadrato', 'area'),
  ('m3', 'Metro cubo', 'other')
on conflict (code) do nothing;

-- Optional: base conversions
update public.inventory_units u
set base_unit_id = (select id from public.inventory_units where code='kg'),
    multiplier = 0.001
where u.code='g' and (u.base_unit_id is null or u.multiplier is null);

update public.inventory_units u
set base_unit_id = (select id from public.inventory_units where code='l'),
    multiplier = 0.001
where u.code='ml' and (u.base_unit_id is null or u.multiplier is null);

-- ------------------------------------------
-- Categories (replaces Product_category; keeps hierarchical option)
-- ------------------------------------------
create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  description text null,
  code text null,
  parent_id uuid null references public.inventory_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_categories_site_name_uk unique (site_id, name)
);

create index if not exists inventory_categories_site_idx
  on public.inventory_categories(site_id);

create index if not exists inventory_categories_parent_idx
  on public.inventory_categories(parent_id);

-- ------------------------------------------
-- Suppliers (optional but useful; keeps your supplier/supplierId clean)
-- ------------------------------------------
create table if not exists public.inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  code text null,
  notes text null,
  -- Additional fields from legacy Supplier table
  short_name text null,
  address text null,
  location text null,
  phone text null,
  email text null,
  website text null,
  contact text null,
  cap integer null,
  supplier_image text null,
  supplier_category_id integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_suppliers_site_name_uk unique (site_id, name)
);

create index if not exists inventory_suppliers_site_idx
  on public.inventory_suppliers(site_id);

-- ------------------------------------------
-- Warehouses / locations (optional)
-- ------------------------------------------
create table if not exists public.inventory_warehouses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,               -- e.g. "Magazzino principale", "Cantiere X", "Frigo bar"
  description text null,
  code text null,                   -- warehouse code for reference
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_warehouses_site_name_uk unique (site_id, name)
);

create index if not exists inventory_warehouses_site_idx
  on public.inventory_warehouses(site_id);

-- ------------------------------------------
-- Inventory items (NOT sellproducts)
-- ------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  description text null,
  item_type text null,                   -- your current "type" (free text)
  category_id uuid null references public.inventory_categories(id) on delete set null,
  supplier_id uuid null references public.inventory_suppliers(id) on delete set null,

  -- behavior flags to cover multiple sectors without extra tables
  is_stocked boolean not null default true,      -- should appear in stock control
  is_consumable boolean not null default true,   -- if it can be consumed
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_site_name_uk unique (site_id, name)
);

create index if not exists inventory_items_site_idx
  on public.inventory_items(site_id);

create index if not exists inventory_items_category_idx
  on public.inventory_items(category_id);

-- ------------------------------------------
-- Variants (technical attributes go in JSONB)
-- ------------------------------------------
create table if not exists public.inventory_item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,

  internal_code text null,           -- your current internal_code
  supplier_code text null,           -- your current supplier_code
  producer text null,
  producer_code text null,

  unit_id uuid null references public.inventory_units(id),
  purchase_unit_price numeric null,  -- your unit_price
  sell_unit_price numeric null,      -- your sell_price (if you want for internal valuation)
  attributes jsonb not null default '{}'::jsonb,  -- color, length, width, height, thickness, diameter, etc.
  image_url text null,
  url_tds text null,

  -- Legacy fields for easier migration
  warehouse_number text null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_variants_site_idx
  on public.inventory_item_variants(site_id);

create index if not exists inventory_variants_item_idx
  on public.inventory_item_variants(item_id);

-- Optional uniqueness (soft): internal_code unique per site when present
create unique index if not exists inventory_variants_site_internal_code_uk
  on public.inventory_item_variants(site_id, internal_code)
  where internal_code is not null;

-- ------------------------------------------
-- Stock movements (source of truth)
-- ------------------------------------------
create table if not exists public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,

  variant_id uuid not null references public.inventory_item_variants(id) on delete cascade,
  warehouse_id uuid null references public.inventory_warehouses(id) on delete set null,

  movement_type text not null,                 -- in, out, adjust, transfer_in, transfer_out, opening
  quantity numeric not null,                   -- signed or positive based on type; keep it positive + type is clearer
  unit_id uuid null references public.inventory_units(id),

  reason text null,                            -- free text
  reference_type text null,                    -- e.g. "invoice", "job", "recipe", "manual"
  reference_id uuid null,                      -- optional
  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint inventory_stock_movements_type_ck
    check (movement_type in ('opening','in','out','adjust','transfer_in','transfer_out'))
);

create index if not exists inventory_movements_site_idx
  on public.inventory_stock_movements(site_id);

create index if not exists inventory_movements_variant_idx
  on public.inventory_stock_movements(variant_id);

create index if not exists inventory_movements_wh_idx
  on public.inventory_stock_movements(warehouse_id);

create index if not exists inventory_movements_occurred_idx
  on public.inventory_stock_movements(occurred_at);

-- ------------------------------------------
-- Stock view (current quantities)
-- ------------------------------------------
create or replace view public.inventory_stock as
select
  m.site_id,
  m.variant_id,
  m.warehouse_id,
  -- signed sum derived from movement_type
  sum(
    case
      when m.movement_type in ('opening','in','transfer_in') then m.quantity
      when m.movement_type in ('out','transfer_out') then -m.quantity
      when m.movement_type = 'adjust' then m.quantity  -- assume adjust is already "delta"
      else 0
    end
  ) as quantity
from public.inventory_stock_movements m
group by m.site_id, m.variant_id, m.warehouse_id;

comment on view public.inventory_stock is
'Computed stock by summing inventory_stock_movements. Source of truth is movements.';

-- ------------------------------------------
-- Optional: trigger to keep updated_at fresh (simple pattern)
-- ------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_variants_updated_at on public.inventory_item_variants;
create trigger trg_inventory_variants_updated_at
before update on public.inventory_item_variants
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_categories_updated_at on public.inventory_categories;
create trigger trg_inventory_categories_updated_at
before update on public.inventory_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_suppliers_updated_at on public.inventory_suppliers;
create trigger trg_inventory_suppliers_updated_at
before update on public.inventory_suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_warehouses_updated_at on public.inventory_warehouses;
create trigger trg_inventory_warehouses_updated_at
before update on public.inventory_warehouses
for each row execute function public.set_updated_at();

-- ==========================================
-- DATA MIGRATION from legacy tables
-- ==========================================

-- Step 1: Migrate categories from Product_category to inventory_categories
insert into public.inventory_categories (site_id, name, description, code, created_at, updated_at)
select 
  pc.site_id,
  pc.name,
  pc.description,
  pc.code,
  COALESCE(pc.created_at::timestamptz, now()),
  COALESCE(pc.updated_at::timestamptz, now())
from public."Product_category" pc
where pc.site_id is not null
on conflict (site_id, name) do nothing;

-- Step 2: Migrate suppliers from Supplier to inventory_suppliers
insert into public.inventory_suppliers (
  site_id, name, code, notes, short_name, address, location, 
  phone, email, website, contact, cap, supplier_image, supplier_category_id,
  created_at, updated_at
)
select 
  s.site_id,
  s.name,
  s.short_name as code,  -- use short_name as code
  s.description as notes,
  s.short_name,
  s.address,
  s.location,
  s.phone,
  s.email,
  s.website,
  s.contact,
  s.cap,
  s.supplier_image,
  s.supplier_category_id,
  COALESCE(s.created_at::timestamptz, now()),
  COALESCE(s.updated_at::timestamptz, now())
from public."Supplier" s
where s.site_id is not null
on conflict (site_id, name) do nothing;

-- Step 3: Create mapping tables for old IDs to new UUIDs
create temp table if not exists _category_mapping as
select 
  pc.id as old_id,
  pc.site_id,
  ic.id as new_id
from public."Product_category" pc
join public.inventory_categories ic on pc.site_id = ic.site_id and pc.name = ic.name;

create temp table if not exists _supplier_mapping as
select 
  s.id as old_id,
  s.site_id,
  ins.id as new_id
from public."Supplier" s
join public.inventory_suppliers ins on s.site_id = ins.site_id and s.name = ins.name;

-- Step 4: Migrate Product to inventory_items
-- First, insert unique items (by name + site_id)
-- Note: Product table uses camelCase column names: categoryId, supplierId
insert into public.inventory_items (
  site_id, name, description, item_type, category_id, supplier_id,
  is_stocked, is_consumable, is_active, created_at, updated_at
)
select distinct on (p.site_id, p.name)
  p.site_id,
  p.name,
  p.description,
  p.type as item_type,
  cm.new_id as category_id,
  sm.new_id as supplier_id,
  true as is_stocked,
  true as is_consumable,
  true as is_active,
  COALESCE(p.created_at::timestamptz, now()),
  COALESCE(p.updated_at::timestamptz, now())
from public."Product" p
left join _category_mapping cm on p."categoryId" = cm.old_id
left join _supplier_mapping sm on p."supplierId" = sm.old_id
where p.site_id is not null
on conflict (site_id, name) do nothing;

-- Step 5: Create mapping for items
create temp table if not exists _item_mapping as
select 
  p.id as old_id,
  p.site_id,
  ii.id as new_id
from public."Product" p
join public.inventory_items ii on p.site_id = ii.site_id and p.name = ii.name;

-- Step 6: Get or create default unit (pz = pezzi)
-- We'll use 'pz' as the default unit
create temp table if not exists _default_unit as
select id from public.inventory_units where code = 'pz' limit 1;

-- Step 7: Migrate Product to inventory_item_variants
insert into public.inventory_item_variants (
  item_id, site_id, internal_code, supplier_code, producer, producer_code,
  unit_id, purchase_unit_price, sell_unit_price, attributes, image_url, url_tds,
  warehouse_number, created_at, updated_at
)
select 
  im.new_id as item_id,
  p.site_id,
  p.internal_code,
  p.supplier_code,
  p.producer,
  p.producer_code,
  (select id from _default_unit) as unit_id,
  p.unit_price as purchase_unit_price,
  p.sell_price as sell_unit_price,
  jsonb_build_object(
    'color', p.color,
    'color_code', p.color_code,
    'width', p.width,
    'height', p.height,
    'length', p.length,
    'thickness', p.thickness,
    'diameter', p.diameter,
    'category', p.category,
    'category_code', p.category_code,
    'subcategory', p.subcategory,
    'subcategory_code', p.subcategory_code,
    'subcategory2', p.subcategory2,
    'subcategory2_code', p.subcategory2_code,
    'legacy_unit', p.unit,
    'legacy_inventory_id', p."inventoryId"
  ) as attributes,
  p.image_url,
  p.url_tds,
  p.warehouse_number,
  COALESCE(p.created_at::timestamptz, now()),
  COALESCE(p.updated_at::timestamptz, now())
from public."Product" p
join _item_mapping im on p.id = im.old_id and p.site_id = im.site_id;

-- Step 8: Create initial stock movements based on current Product quantities
insert into public.inventory_stock_movements (
  site_id, variant_id, warehouse_id, movement_type, quantity, unit_id, 
  reason, reference_type, occurred_at, created_at
)
select 
  v.site_id,
  v.id as variant_id,
  null as warehouse_id,
  'opening' as movement_type,
  p.quantity,
  v.unit_id,
  'Migrazione da sistema legacy' as reason,
  'migration' as reference_type,
  COALESCE(p.created_at::timestamptz, now()) as occurred_at,
  now() as created_at
from public."Product" p
join _item_mapping im on p.id = im.old_id and p.site_id = im.site_id
join public.inventory_item_variants v on v.item_id = im.new_id 
  and COALESCE(v.internal_code, '') = COALESCE(p.internal_code, '')
where p.quantity > 0;

-- Clean up temp tables
drop table if exists _category_mapping;
drop table if exists _supplier_mapping;
drop table if exists _item_mapping;
drop table if exists _default_unit;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Enable RLS on all new tables
alter table public.inventory_units enable row level security;
alter table public.inventory_categories enable row level security;
alter table public.inventory_suppliers enable row level security;
alter table public.inventory_warehouses enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_item_variants enable row level security;
alter table public.inventory_stock_movements enable row level security;

-- Units are global (read-only for authenticated)
create policy "inventory_units_select" on public.inventory_units
  for select using (true);

-- Categories, Suppliers, Warehouses, Items, Variants, Movements: site-based access via user_sites
create policy "inventory_categories_select" on public.inventory_categories
  for select using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_categories_insert" on public.inventory_categories
  for insert with check (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_categories_update" on public.inventory_categories
  for update using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_categories_delete" on public.inventory_categories
  for delete using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

-- Similar policies for suppliers
create policy "inventory_suppliers_select" on public.inventory_suppliers
  for select using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_suppliers_insert" on public.inventory_suppliers
  for insert with check (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_suppliers_update" on public.inventory_suppliers
  for update using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_suppliers_delete" on public.inventory_suppliers
  for delete using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

-- Warehouses policies
create policy "inventory_warehouses_select" on public.inventory_warehouses
  for select using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_warehouses_insert" on public.inventory_warehouses
  for insert with check (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_warehouses_update" on public.inventory_warehouses
  for update using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_warehouses_delete" on public.inventory_warehouses
  for delete using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

-- Items policies
create policy "inventory_items_select" on public.inventory_items
  for select using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_items_insert" on public.inventory_items
  for insert with check (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_items_update" on public.inventory_items
  for update using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_items_delete" on public.inventory_items
  for delete using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

-- Variants policies
create policy "inventory_variants_select" on public.inventory_item_variants
  for select using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_variants_insert" on public.inventory_item_variants
  for insert with check (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_variants_update" on public.inventory_item_variants
  for update using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_variants_delete" on public.inventory_item_variants
  for delete using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

-- Stock movements policies
create policy "inventory_movements_select" on public.inventory_stock_movements
  for select using (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

create policy "inventory_movements_insert" on public.inventory_stock_movements
  for insert with check (
    exists (
      select 1 from public.user_sites us
      where us.user_id = auth.uid() and us.site_id = site_id
    )
  );

-- ==========================================
-- GRANTS
-- ==========================================

grant all on public.inventory_units to anon, authenticated, service_role;
grant all on public.inventory_categories to anon, authenticated, service_role;
grant all on public.inventory_suppliers to anon, authenticated, service_role;
grant all on public.inventory_warehouses to anon, authenticated, service_role;
grant all on public.inventory_items to anon, authenticated, service_role;
grant all on public.inventory_item_variants to anon, authenticated, service_role;
grant all on public.inventory_stock_movements to anon, authenticated, service_role;
grant select on public.inventory_stock to anon, authenticated, service_role;

-- ==========================================
-- Comments
-- ==========================================

comment on table public.inventory_units is 'Unità di misura per l''inventario (globali)';
comment on table public.inventory_categories is 'Categorie prodotti inventario per site';
comment on table public.inventory_suppliers is 'Fornitori per site';
comment on table public.inventory_warehouses is 'Magazzini/location per site';
comment on table public.inventory_items is 'Articoli inventario (master data)';
comment on table public.inventory_item_variants is 'Varianti articoli con attributi tecnici';
comment on table public.inventory_stock_movements is 'Movimenti di magazzino (source of truth per quantità)';

