-- =============================================================================
-- MANUALE — indice su "TaskHistory"("taskId")
-- =============================================================================
-- DA LANCIARE A MANO dall'SQL editor, FUORI dalle migration.
-- CREATE INDEX CONCURRENTLY non puo' girare dentro un blocco transazionale,
-- quindi non puo' stare in supabase/migrations/.
--
-- STATO AL 22.09.2026 SUL PROGETTO jzxffusiwtrvjwmpjztu:
--   l'indice "idx_taskhistory_taskid" ESISTE GIA', e' valido, ready, 6104 kB
--   su 592 451 righe. Questo script e' quindi un NO-OP sul remoto: e' fornito
--   per ambienti (locale, branch Supabase, nuovi progetti) dove l'indice manchi.
--
-- La tabella pesa 946 MB: se l'indice andasse davvero creato, va fatto fuori
-- orario. CONCURRENTLY non blocca le scritture.
-- =============================================================================

-- 1) VERIFICA PRELIMINARE — se restituisce una riga, non serve fare altro.
select
  i.relname                                as indice,
  x.indisvalid                             as valido,
  x.indisready                             as pronto,
  pg_size_pretty(pg_relation_size(i.oid))  as dimensione,
  pg_get_indexdef(i.oid)                   as definizione
from pg_class c
join pg_index x     on x.indrelid = c.oid
join pg_class i     on i.oid = x.indexrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum = x.indkey[0]
where n.nspname = 'public'
  and c.relname = 'TaskHistory'
  and a.attname = 'taskId';

-- 2) CREAZIONE — solo se il punto 1 non ha restituito nulla.
--    Eseguire DA SOLA, non dentro una transazione.
create index concurrently if not exists "TaskHistory_taskId_idx"
  on public."TaskHistory" ("taskId");

-- 3) VERIFICA POST — l'indice deve risultare indisvalid = true.
--    Se CONCURRENTLY fallisce lascia un indice INVALID: in quel caso
--    droppare con  drop index concurrently public."TaskHistory_taskId_idx";
--    e ripetere il passo 2.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'TaskHistory'
order by indexname;
