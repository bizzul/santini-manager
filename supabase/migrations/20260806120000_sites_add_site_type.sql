-- Distinguish campaign sites from business ("azienda") sites without scattering
-- hardcoded UUID checks across the codebase. Default keeps every existing site
-- unchanged.
alter table public.sites
  add column if not exists site_type text not null default 'azienda'
  check (site_type in ('azienda', 'campagna_elettorale'));

update public.sites
  set site_type = 'campagna_elettorale'
  where id in (
    'd92a0e9b-14e2-4dca-a8d8-15ca4ff1edad',
    '7d0021b9-71e1-4449-a38c-7fd4c31a1d72'
  );
