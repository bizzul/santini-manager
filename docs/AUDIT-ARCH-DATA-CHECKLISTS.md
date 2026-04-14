# Audit Architettura Dati - Checklist Operative

Questo documento traduce il piano in checklist eseguibili per area.

## Area A - Database e Schema Evolution

- [ ] Verificare ordine, naming e unicita dei file in `supabase/migrations`.
- [ ] Confermare baseline e ruolo dei dump storici in `supabase/migrations/20250710113610_remote_schema.sql` e `supabase/migrations/202507101310_schema_progetto_a.sql`.
- [ ] Validare coerenza DDL: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `NOT NULL` su tabelle core (`Task`, `clients`, `products`, `offers`, attendance, inventory).
- [ ] Mappare indici esistenti e mismatch con query usate da `lib/server-data.ts` e route ad alto traffico.
- [ ] Verificare migrazioni legate a cancellazioni/task e performance (`20260408163000_add_task_delete_indexes.sql`).
- [ ] Verificare configurazione seed in `supabase/config.toml` e presenza asset seed effettivi.
- [ ] Verificare duplicazioni di migration tree non canonici (`supabase-sellproduct-patch`, `.tmp-safe-migration`) e definire source of truth.
- [ ] Allineare strategia tipi DB: `types/database.types.ts` vs `types/supabase.ts`.

## Area B - Sicurezza Dati e Isolamento Tenant

- [ ] Inventariare `ENABLE ROW LEVEL SECURITY` e policy per tutte le tabelle multi-tenant.
- [ ] Cercare policy permissive (`USING (true)`/`WITH CHECK (true)`) su dati tenant.
- [ ] Verificare uso di `createServiceClient` in `app/api/**` e `lib/**` con controllo membership sito/utente.
- [ ] Validare che `x-site-id`/`x-site-domain` non siano usati come unica autorizzazione (`lib/site-context.ts`).
- [ ] Verificare wrapper auth in `lib/api/with-site-auth.ts` contro accesso reale a `user_sites`.
- [ ] Verificare isolamento su route report/suppliers/tasks ad alto rischio data leak.
- [ ] Revisionare policy storage bucket (es. `files`, `site-logos`) e visibilita pubblica.
- [ ] Confermare che endpoint debug/ops non bypassino autorizzazioni in produzione.

## Area C - Funzioni, Query e Transazionalita

- [ ] Mappare tutti i punti data-access: `modules/*/services`, `app/api/**`, `app/sites/**/actions`, `lib/server-data.ts`.
- [ ] Identificare query con `select("*")` da ridurre a campi minimi.
- [ ] Individuare loop con query sequenziali e possibili N+1 in route e actions.
- [ ] Verificare operazioni multi-step senza transazione (delete+insert, update+audit, bulk move).
- [ ] Definire candidate RPC SQL per atomicita (`permissions replace`, `move task`, `import batch`, `delete cascade`).
- [ ] Verificare fallback non atomici nella generazione codici in `lib/code-generator.ts`.
- [ ] Uniformare boundary tra logica dominio e persistenza (ridurre duplicazioni tra API e actions).

## Area D - Integrazioni Dati Interne/Esterne

- [ ] Verificare coerenza contratti request/response per `app/api/**`.
- [ ] Uniformare shape errori API con `hooks/use-api.ts` (`error`, `message`, `code`).
- [ ] Verificare endpoint client referenziati ma assenti (`/api/tasks/[taskId]`, `/api/clients/[clientId]`).
- [ ] Validare flussi import/export CSV (`app/api/*/import-csv/route.ts`, `lib/sell-product-import.ts`).
- [ ] Verificare integrazione AI/voice (`app/api/voice-input/**`, `lib/ai/get-site-ai-config.ts`) su timeout, fallback e per-tenant billing.
- [ ] Verificare resilienza integrazioni Vercel (`lib/domains.ts`, `app/api/upload/route.ts`, cron).
- [ ] Verificare disallineamenti tra risoluzione domain/subdomain nei flussi di integrazione.
- [ ] Valutare e deprecare duplicati API sotto `app/api/api/**`.

## Area E - Caching, Realtime, Consistenza

- [ ] Mappare cache server: `cache()` in `lib/server-data.ts` e `unstable_cache` in `lib/fetchers.ts`.
- [ ] Verificare che ogni `revalidateTag` corrisponda a un producer di cache taggata reale.
- [ ] Allineare `revalidatePath` ai path effettivi tenant (`/sites/[domain]/...`).
- [ ] Verificare mix `router.refresh`, invalidazione query TanStack e invalidazione RSC.
- [ ] Verificare coerenza chiavi query (`kanban-categories`, `tasks`, `kanban`) tra hooks e invalidazioni.
- [ ] Verificare realtime Supabase (`hooks/use-realtime-kanban.ts`) su reconnect, error handling e copertura eventi.
- [ ] Verificare TTL metadata sito (15m) e impatto su provisioning/rename dominio.

## Area F - Qualita Operativa (Test, Osservabilita, Diagnostica)

- [ ] Verificare presenza di pipeline CI per `lint`, `test`, `build`.
- [ ] Mappare copertura attuale e gap su `app/api/**/route.ts`.
- [ ] Definire suite minima regressione per flussi critici: move task, import CSV, upload, cron, amministrazione utenti.
- [ ] Verificare coerenza logging (`lib/logger.ts`) e rimozione `console.*` residui.
- [ ] Verificare sicurezza endpoint debug (`app/api/debug/**`) per ambienti non-dev.
- [ ] Verificare hardening route cron (`app/api/cron/auto-archive/route.ts`) con secret obbligatorio.
- [ ] Allineare gate qualita build (`next.config.js` oggi ignora ESLint in build).

## Output atteso per ogni area

- Evidenze (file e percorsi coinvolti).
- Findings con severity (`critical`, `high`, `medium`, `low`) ed effort (`S`, `M`, `L`).
- Quick wins (<= 2 giorni) e interventi strutturali (> 1 sprint).
