-- =============================================================================
-- RLS hardening — Ondata A: inventory_categories, inventory_items, inventory_item_variants, inventory_suppliers, inventory_warehouses, inventory_subcategory_images
-- =============================================================================
-- Le policy corrette per le prime cinque tabelle sono gia' state create da
-- 20260923091000_rls_fix_policy_errate.sql (sostituendo quelle tautologiche):
-- qui si attiva solo la RLS. Per inventory_subcategory_images, che non aveva
-- nessuna policy, si crea il set completo.
--
-- Su tutte e sei site_id e' NOT NULL, quindi il predicato "site_id is not null"
-- e' ridondante e viene omesso: si usa direttamente user_can_access_site(site_id).
--
-- inventory_units NON e' qui: e' una tabella globale senza site_id e viene
-- trattata nell'ondata C.
-- Pattern: prima le policy, poi enable row level security, nella stessa migration.
-- Tutte le policy sono "to authenticated": il ruolo anon non compare mai, quindi
-- senza login queste tabelle restituiscono 0 righe e rifiutano ogni scrittura.
--
-- Nessun dato viene modificato.
-- =============================================================================

-- Le cinque tabelle gia' corrette allo Step 2: solo attivazione.
alter table public.inventory_categories    enable row level security;
alter table public.inventory_items         enable row level security;
alter table public.inventory_item_variants enable row level security;
alter table public.inventory_suppliers     enable row level security;
alter table public.inventory_warehouses    enable row level security;

-- inventory_subcategory_images (30 righe, site_id NOT NULL, nessuna policy)
create policy "inventory_subcategory_images_select_site" on public.inventory_subcategory_images
  for select to authenticated
  using (public.user_can_access_site(site_id));

create policy "inventory_subcategory_images_insert_site" on public.inventory_subcategory_images
  for insert to authenticated
  with check (public.user_can_access_site(site_id));

create policy "inventory_subcategory_images_update_site" on public.inventory_subcategory_images
  for update to authenticated
  using (public.user_can_access_site(site_id))
  with check (public.user_can_access_site(site_id));

create policy "inventory_subcategory_images_delete_site" on public.inventory_subcategory_images
  for delete to authenticated
  using (public.user_can_access_site(site_id));

alter table public.inventory_subcategory_images enable row level security;

