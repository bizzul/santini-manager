-- Template di righe base per categoria.
--
-- Scelta la categoria, le posizioni ricorrenti compaiono gia' scritte e
-- l'utente tocca solo misure e quantita'. Il contenuto esiste gia': nelle 153
-- offerte Santini 2026 il blocco descrittivo Aluplast/Siegenia/Secustik
-- ricorre 44 volte e il Grauthoff 36.

create table if not exists public.offerta_template (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  categoria  text not null,
  nome       text not null,
  descrizione text,
  attivo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offerta_template_site_cat_nome_unique unique (site_id, categoria, nome)
);

create table if not exists public.offerta_template_riga (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.offerta_template(id) on delete cascade,
  ordine          integer not null default 0,
  sell_product_id integer,
  descrizione     text not null,
  testo_base      text,
  unita           text not null default 'Pz.',
  quantita_default numeric not null default 1,
  richiede_misure boolean not null default false,
  attivo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists offerta_template_riga_template_idx
  on public.offerta_template_riga (template_id, ordine);
create index if not exists offerta_template_site_cat_idx
  on public.offerta_template (site_id, categoria, attivo);

drop trigger if exists offerta_template_touch on public.offerta_template;
create trigger offerta_template_touch
  before update on public.offerta_template
  for each row execute function public.fdm_touch_updated_at();

drop trigger if exists offerta_template_riga_touch on public.offerta_template_riga;
create trigger offerta_template_riga_touch
  before update on public.offerta_template_riga
  for each row execute function public.fdm_touch_updated_at();

alter table public.offerta_template enable row level security;
alter table public.offerta_template_riga enable row level security;

create policy offerta_template_select_site_access on public.offerta_template
  for select using (user_can_access_site(site_id));
create policy offerta_template_insert_site_access on public.offerta_template
  for insert with check (user_can_access_site(site_id));
create policy offerta_template_update_site_access on public.offerta_template
  for update using (user_can_access_site(site_id));
create policy offerta_template_delete_site_access on public.offerta_template
  for delete using (user_can_access_site(site_id));

create policy offerta_template_riga_select_site_access on public.offerta_template_riga
  for select using (exists (
    select 1 from public.offerta_template t
    where t.id = template_id and user_can_access_site(t.site_id)));
create policy offerta_template_riga_insert_site_access on public.offerta_template_riga
  for insert with check (exists (
    select 1 from public.offerta_template t
    where t.id = template_id and user_can_access_site(t.site_id)));
create policy offerta_template_riga_update_site_access on public.offerta_template_riga
  for update using (exists (
    select 1 from public.offerta_template t
    where t.id = template_id and user_can_access_site(t.site_id)));
create policy offerta_template_riga_delete_site_access on public.offerta_template_riga
  for delete using (exists (
    select 1 from public.offerta_template t
    where t.id = template_id and user_can_access_site(t.site_id)));
