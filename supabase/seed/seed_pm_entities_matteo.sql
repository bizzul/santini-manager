-- =============================================================================
-- SEED pm_entities per Matteo — eseguire MANUALMENTE nel SQL editor DOPO
-- la migration 20260714040000_pm_voice_first.sql.
-- -- SOSTITUIRE EMAIL: confermare l'email qui sotto prima di eseguire.
-- =============================================================================

with utente as (
  select id from auth.users
  where email = 'SOSTITUIRE@EMAIL.COM' -- SOSTITUIRE EMAIL
  limit 1
)
insert into public.pm_entities (user_id, name, type, aliases)
select utente.id, e.name, e.type, e.aliases
from utente,
(values
  ('MMM',                 'progetto', array['medical manager', 'matris medical manager']),
  ('FDM',                 'progetto', array['full data manager']),
  ('Momentum',            'progetto', array[]::text[]),
  ('GSH',                 'progetto', array['grand hotel locarno', 'grand hotel']),
  ('Mornera Sky Festival','progetto', array['mornera', 'sky festival']),
  ('DigitalWine',         'progetto', array[]::text[]),
  ('Nova Arboris',        'progetto', array[]::text[]),
  ('HAIB',                'progetto', array[]::text[]),
  ('Swiss Frame',         'azienda',  array[]::text[]),
  ('Baccialegno',         'azienda',  array[]::text[]),
  ('Formateria',          'azienda',  array[]::text[]),
  ('Santini',             'azienda',  array['falegnameria santini']),
  ('Guido Trinci',        'persona',  array['guido']),
  ('Omar Beltraminelli',  'persona',  array['omar']),
  ('Fabio Käppeli',       'persona',  array['fabio']),
  ('Katia',               'persona',  array[]::text[])
) as e(name, type, aliases);
