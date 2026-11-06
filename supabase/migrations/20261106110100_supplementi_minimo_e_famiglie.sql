-- Due limiti dei supplementi.
--
-- 1. Nessun minimo fatturabile: un "225 CHF/mq, minimo 65.-" (forma reale dei
--    listini serramenti) oggi non e' esprimibile.
-- 2. supplementi_categorie lega il supplemento solo alla categoria, non alla
--    famiglia: non si puo' dire quali supplementi sono ammessi su un prodotto.

alter table public.supplementi
  add column if not exists valore_minimo_chf  numeric,
  add column if not exists valore_massimo_chf numeric;

comment on column public.supplementi.valore_minimo_chf is
  'Importo minimo fatturabile. Es. 225 CHF/mq con minimo 65.-';
comment on column public.supplementi.valore_massimo_chf is
  'Tetto massimo; null = nessun tetto.';

alter table public.supplementi
  drop constraint if exists supplementi_min_max_coerenti;
alter table public.supplementi
  add constraint supplementi_min_max_coerenti
  check (valore_minimo_chf is null
      or valore_massimo_chf is null
      or valore_minimo_chf <= valore_massimo_chf);

create table if not exists public.supplementi_famiglie (
  supplemento_id uuid not null
    references public.supplementi(id) on delete cascade,
  famiglia_cod   text not null,
  primary key (supplemento_id, famiglia_cod)
);

alter table public.supplementi_famiglie enable row level security;

create policy supplementi_famiglie_select_site_access on public.supplementi_famiglie
  for select using (exists (
    select 1 from public.supplementi s
    where s.id = supplemento_id and user_can_access_site(s.site_id)));
create policy supplementi_famiglie_insert_site_access on public.supplementi_famiglie
  for insert with check (exists (
    select 1 from public.supplementi s
    where s.id = supplemento_id and user_can_access_site(s.site_id)));
create policy supplementi_famiglie_update_site_access on public.supplementi_famiglie
  for update using (exists (
    select 1 from public.supplementi s
    where s.id = supplemento_id and user_can_access_site(s.site_id)));
create policy supplementi_famiglie_delete_site_access on public.supplementi_famiglie
  for delete using (exists (
    select 1 from public.supplementi s
    where s.id = supplemento_id and user_can_access_site(s.site_id)));
