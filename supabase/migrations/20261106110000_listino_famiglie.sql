-- Anagrafica delle famiglie di apertura.
--
-- Oggi listino_griglia_base.famiglia_apertura_cod e SellProduct.famiglia_apertura_cod
-- sono text liberi senza riferimento: un refuso non da' errore, fa solo sparire
-- il prezzo. Su un'offerta grande passa inosservato.

create or replace function public.fdm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.listino_famiglie (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites(id) on delete cascade,
  codice           text not null,
  nome             text not null,
  categoria        text not null,
  larghezza_min_mm integer,
  larghezza_max_mm integer,
  altezza_min_mm   integer,
  altezza_max_mm   integer,
  attivo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint listino_famiglie_site_codice_unique unique (site_id, codice)
);

drop trigger if exists listino_famiglie_touch on public.listino_famiglie;
create trigger listino_famiglie_touch
  before update on public.listino_famiglie
  for each row execute function public.fdm_touch_updated_at();

alter table public.listino_famiglie enable row level security;

create policy listino_famiglie_select_site_access on public.listino_famiglie
  for select using (user_can_access_site(site_id));
create policy listino_famiglie_insert_site_access on public.listino_famiglie
  for insert with check (user_can_access_site(site_id));
create policy listino_famiglie_update_site_access on public.listino_famiglie
  for update using (user_can_access_site(site_id));
create policy listino_famiglie_delete_site_access on public.listino_famiglie
  for delete using (user_can_access_site(site_id));

-- Popolamento dai codici gia' in uso. La categoria si deduce dal prefisso;
-- i nomi vanno rifiniti a mano dopo.
insert into public.listino_famiglie (site_id, codice, nome, categoria)
select distinct p.site_id, p.famiglia_apertura_cod, p.famiglia_apertura_cod,
       case
         when p.famiglia_apertura_cod like 'FIN%' then 'Serramenti'
         when p.famiglia_apertura_cod like 'PF%'  then 'Serramenti'
         when p.famiglia_apertura_cod like 'POR%' then 'Porte'
         when p.famiglia_apertura_cod like 'ARM%' then 'Arredamento'
         else 'Da classificare'
       end
from public."SellProduct" p
where p.famiglia_apertura_cod is not null
  and btrim(p.famiglia_apertura_cod) <> ''
on conflict (site_id, codice) do nothing;

insert into public.listino_famiglie (site_id, codice, nome, categoria)
select distinct g.site_id, g.famiglia_apertura_cod, g.famiglia_apertura_cod,
       'Da classificare'
from public.listino_griglia_base g
on conflict (site_id, codice) do nothing;

-- La FK si aggiunge DOPO il popolamento, altrimenti le righe esistenti la
-- violerebbero. Da qui in poi un refuso e' un errore, non un prezzo mancante.
alter table public.listino_griglia_base
  drop constraint if exists listino_griglia_base_famiglia_fkey;
alter table public.listino_griglia_base
  add constraint listino_griglia_base_famiglia_fkey
  foreign key (site_id, famiglia_apertura_cod)
  references public.listino_famiglie (site_id, codice)
  on delete restrict;

create index if not exists listino_griglia_base_lookup_idx
  on public.listino_griglia_base (site_id, famiglia_apertura_cod, attivo);
create index if not exists listino_coefficienti_lookup_idx
  on public.listino_coefficienti (site_id, categoria, codice, attivo);
