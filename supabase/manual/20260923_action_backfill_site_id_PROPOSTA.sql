-- =============================================================================
-- PROPOSTA — backfill di Action.site_id
-- =============================================================================
-- NON ESEGUITO. NON E' UNA MIGRATION: questo file sta fuori da
-- supabase/migrations/ apposta, perche' modifica dati reali.
-- Va eseguito a mano solo dopo decisione esplicita (decisione D-1 in
-- docs/RLS-HARDENING-2026-09.md).
--
-- CONTESTO
-- Con la policy di ondata A, le righe di Action con site_id NULL restano
-- visibili al solo superadmin. Non c'e' nessuna urgenza tecnica di fare il
-- backfill: serve solo se si vuole restituire quello storico agli spazi.
--
-- STATO AL 22.09.2026 (5 065 righe totali, 1 867 con site_id NULL):
--     18 righe  -> hanno taskId e il Task ha site_id      => backfillabili (fase 1)
--     34 righe  -> hanno solo clientId                    => fase 2, opzionale
--  1 815 righe  -> nessun padre, solo user_id             => fase 3, euristica
--                  di cui 847 appartengono a un utente con UN SOLO user_sites
--
-- Il backfill chiesto dal piano (da Task via taskId) recupera quindi
-- 18 righe su 1 867. Il grosso dello storico non e' ricostruibile in modo certo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. VERIFICA PRELIMINARE — eseguire SEMPRE prima di qualsiasi UPDATE.
-- -----------------------------------------------------------------------------

-- 0a. Quante righe, come si distribuiscono.
select
  count(*)                                                      as null_site_totali,
  count(*) filter (where a."taskId" is not null)                as con_task,
  count(*) filter (where t.site_id is not null)                 as backfillabili_da_task,
  count(*) filter (where a."taskId" is null and a."clientId" is not null) as solo_client,
  count(*) filter (where a."taskId" is null and a."clientId" is null)     as senza_padre
from public."Action" a
left join public."Task" t on t.id = a."taskId"
where a.site_id is null;

-- 0b. Fase 1 nel dettaglio: quali spazi riceverebbero quante righe.
select s.name as spazio, s.subdomain, count(*) as righe
from public."Action" a
join public."Task"  t on t.id = a."taskId"
join public.sites   s on s.id = t.site_id
where a.site_id is null
group by s.name, s.subdomain
order by righe desc;

-- 0c. Le righe esatte che verrebbero toccate dalla fase 1 (elenco completo).
select a.id, a.type, a."createdAt", a."taskId", t.site_id as site_id_proposto
from public."Action" a
join public."Task" t on t.id = a."taskId"
where a.site_id is null and t.site_id is not null
order by a.id;


-- -----------------------------------------------------------------------------
-- 1. FASE 1 — backfill da Task.site_id via taskId.  ~18 righe.
--    Questo e' il backfill chiesto dal piano. E' il piu' sicuro: la relazione
--    Action -> Task e' esplicita.
--    ESEGUIRE DENTRO UNA TRANSAZIONE e controllare il conteggio prima di COMMIT.
-- -----------------------------------------------------------------------------

-- begin;
--
-- update public."Action" a
--    set site_id = t.site_id
--   from public."Task" t
--  where t.id = a."taskId"
--    and a.site_id is null
--    and t.site_id is not null;
--
-- -- deve restituire 0
-- select count(*) as ancora_null_con_task
--   from public."Action" a
--   join public."Task" t on t.id = a."taskId"
--  where a.site_id is null and t.site_id is not null;
--
-- commit;   -- oppure rollback;


-- -----------------------------------------------------------------------------
-- 2. FASE 2 — OPZIONALE, da Client.site_id via clientId.  ~34 righe.
--    Relazione esplicita anche questa, ma il Client puo' essere stato spostato
--    di spazio dopo l'azione. Verificare 0b adattata prima di eseguire.
-- -----------------------------------------------------------------------------

-- select c.site_id, count(*) from public."Action" a
--   join public."Client" c on c.id = a."clientId"
--  where a.site_id is null and a."taskId" is null and c.site_id is not null
--  group by c.site_id;
--
-- begin;
-- update public."Action" a
--    set site_id = c.site_id
--   from public."Client" c
--  where c.id = a."clientId"
--    and a.site_id is null
--    and a."taskId" is null
--    and c.site_id is not null;
-- commit;   -- oppure rollback;


-- -----------------------------------------------------------------------------
-- 3. FASE 3 — EURISTICA, NON RACCOMANDATA.  ~847 righe.
--    Attribuisce l'azione all'unico spazio dell'utente che l'ha compiuta.
--    E' un'inferenza, non un dato: l'utente puo' essere stato aggiunto o
--    rimosso da spazi dopo l'azione. Attribuirebbe storico a uno spazio
--    sbagliato senza modo di accorgersene.
--    Riportata solo per completezza. Sconsigliata.
-- -----------------------------------------------------------------------------

-- select count(*) from public."Action" a
--  where a.site_id is null and a."taskId" is null and a."clientId" is null
--    and (select count(*) from public.user_sites us where us.user_id::text = a.user_id) = 1;
--
-- -- update deliberatamente non fornito.


-- -----------------------------------------------------------------------------
-- 4. VERIFICA FINALE
-- -----------------------------------------------------------------------------

-- select count(*) filter (where site_id is null) as ancora_senza_spazio,
--        count(*)                                as totali
--   from public."Action";
