---

# Stream 1 - Security & Multi-Tenant

## Sommario esecutivo (max 5 bullet)

- **F-001 resta valido e va esteso**: in `app/api/**` ci sono molte route che usano `createServiceClient()` con tenant ricavato da `getSiteContext` (header `x-site-id` / `x-site-domain`) **senza** verifica che l’utente autenticato appartenga a quel sito (`user_sites`). Il wrapper `withSiteAuth` autentica l’utente ma **non** lega il sito alla membership (vedi sotto).
- **F-002 (RLS Task) CONFERMATO sul repo**: nelle migrazioni non risulta `ENABLE ROW LEVEL SECURITY` su `"public"."Task"`; nello schema base ci sono `GRANT ALL` verso `anon` e `authenticated` — rischio massiccio se si usa il client utente senza filtri rigidi.
- **F-004 CONFERMATO**: `GET /api/tasks` interroga `Task` senza filtro `site_id` e restituisce errori come stringa (`err.message`).
- **F-006 CONFERMATO**: cron con `CRON_SECRET` opzionale; `/api/debug/**` senza gate ambiente (esposizione metadati e uso di service client su più endpoint).
- **Nuovo (RLS permissive)**: tabelle HR (`attendance_entries`, `leave_requests`) hanno `SELECT` con `USING (true)`; `internal_activities` ha policy `USING (true)` su INSERT/UPDATE/DELETE. Storage: bucket `files`, `site-logos`, `site-images` (e `documents` in migrazione dedicata) configurati come **public** con lettura `TO public`.

---

## Findings nuovi

### S1-F01
- **Area**: B  
- **Severity**: high  
- **Effort**: M  
- **Evidence**: `/Users/matteopaolocci/santini-manager/lib/api/with-site-auth.ts:31-58`  
- **Descrizione**: `withSiteAuth` richiede sessione (`getUserContext`) e un `siteId` da `getSiteContext(req)`, ma **non** esegue `assertUserCanAccessSite` / query su `user_sites` per il `siteContext.siteId`. Un utente autenticato potrebbe, in teoria, chiamare API che usano questo wrapper passando header di un altro tenant (se il client o la route consentono header arbitrari).  
- **Proposta concreta**: dopo risoluzione `siteId`, obbligare `user_sites` (o equivalente org) e fallire con 403; centralizzare in un’unica funzione usata da HOF e da route service-role.  
- **KPI verifica**: 100% route che accettano contesto sito da richiesta hanno test che falliscono senza riga `user_sites` attesa.

### S1-F02
- **Area**: B  
- **Severity**: critical  
- **Effort**: L  
- **Evidence**: `/Users/matteopaolocci/santini-manager/supabase/migrations/202507101310_schema_progetto_a.sql:1882-1884` (nessuna `ENABLE ROW LEVEL SECURITY` per `"Task"` nello stesso file; assenza di migrazioni successive che abilitino RLS su `Task` nei grep su `supabase/migrations`).  
- **Descrizione**: Il modello dati per i task è centrale al multi-tenant; senza RLS su `Task`, il client `authenticated` (come in `app/api/tasks/route.ts`) non ha barriera DB se la query è incompleta.  
- **Proposta concreta**: abilitare RLS su `Task` (e tabelle correlate senza RLS) con policy `site_id` + membership; rivedere tutti i `GRANT` ereditati dallo schema base.  
- **KPI verifica**: query `pg_policies` / test di regressione: utente A non legge righe `site_id` di B anche con `select('*')`.

### S1-F03
- **Area**: B  
- **Severity**: high  
- **Effort**: M  
- **Evidence**: `/Users/matteopaolocci/santini-manager/supabase/migrations/20260305000000_add_attendance_module.sql:47-75` (`USING (true)` su SELECT per `attendance_entries` e `leave_requests`); `/Users/matteopaolocci/santini-manager/supabase/migrations/20260114000000_internal_activities_table.sql:34-45` (`WITH CHECK (true)` / `USING (true)` su scrittura).  
- **Descrizione**: RLS “accesa” ma le policy SELECT o mutazioni sono globali per gli utenti autenticati: leak cross-tenant a livello DB se qualcuno conosce ID o usa client diretto.  
- **Proposta concreta**: sostituire `true` con predicati su `site_id` + `user_sites` / ruoli HR.  
- **KPI verifica**: test RLS su Supabase per lettura righe di altro `site_id` → 0 righe.

### S1-F04
- **Area**: B  
- **Severity**: medium  
- **Effort**: M  
- **Evidence**: `/Users/matteopaolocci/santini-manager/supabase/migrations/20260202100000_create_files_bucket_with_rls.sql:1-27` (`public = true`, policy `"Anyone can view files"` `TO public` `USING (bucket_id = 'files')`); `/Users/matteopaolocci/santini-manager/supabase/migrations/20250608000000_create_site_images_bucket.sql:15-69` (bucket `site-logos` / `site-images` public + SELECT pubblico).  
- **Descrizione**: Oggetti in questi bucket sono leggibili pubblicamente se l’URL è noto; non c’è isolamento tenant in lettura lato storage per `files` (solo `bucket_id = 'files'`).  
- **Proposta concreta**: valutare bucket privati + signed URL per tenant, o path enforcement `site_id` nelle policy storage (come già parzialmente fatto per `documents` in migrazioni successive).  
- **KPI verifica**: URL di un file di tenant A non accessibile senza token da sessione tenant A.

### S1-F05
- **Area**: F  
- **Severity**: medium  
- **Effort**: S  
- **Evidence**: `/Users/matteopaolocci/santini-manager/app/api/debug/basic/route.ts:12-18` (flag `has_service_key`, nomi cookie); `/Users/matteopaolocci/santini-manager/app/api/debug/vercel-env/route.ts:12-27` e `72-79` (preview URL Supabase, lunghezza service key); `/Users/matteopaolocci/santini-manager/app/api/debug/site-lookup/route.ts:39-56` (service client, lista siti).  
- **Descrizione**: Oltre a F-006, più endpoint debug combinano **metadati sensibili** (presenza chiavi, struttura env) e accesso dati con **service role**, senza `NODE_ENV === 'development'` o segreto condiviso.  
- **Proposta concreta**: un unico guard (env + secret header) su tutto `app/api/debug/**`; default 404 in produzione.  
- **KPI verifica**: scan esterno su staging/prod → HTTP 404 per `/api/debug/*`.

### S1-F06
- **Area**: D  
- **Severity**: low  
- **Effort**: S  
- **Evidence**: `/Users/matteopaolocci/santini-manager/app/api/upload/route.ts:1-26` e `/Users/matteopaolocci/santini-manager/app/api/api/upload/route.ts:1-26` (file identici); `/Users/matteopaolocci/santini-manager/app/api/api/confirm/route.ts` vs pattern auth centralizzato (OTP Supabase).  
- **Descrizione**: Duplicazione path `app/api/api/**` (cfr. F-018 backlog): rischio di aggiornare una sola copia (policy upload, auth, rate limit).  
- **Proposta concreta**: deprecare un albero, redirect 308 o rimozione dopo migrazione client.  
- **KPI verifica**: un solo file sorgente per POST upload in codebase.

---

## Findings audit esistenti confermati (F-001..F-020)

| ID | Stato | Nota breve |
|----|--------|------------|
| **F-001** | **CONFERMATO** | Esempi: `app/api/suppliers/route.ts:10-27`, `app/api/reports/tasks/route.ts:91-109` — service + `getSiteContext`, nessun controllo `user_sites` sul chiamante. |
| **F-002** | **CONFERMATO** | Nessun `ENABLE ROW LEVEL SECURITY` su `Task` nelle migrazioni analizzate; `GRANT ALL` su `Task` in `202507101310_schema_progetto_a.sql:1882-1884`. Validazione “DB reale” resta consigliata per drift. |
| **F-003** | *Non oggetto di questo stream* | — |
| **F-004** | **CONFERMATO** | `app/api/tasks/route.ts:15-18` — `.from("Task").select(...)` senza `.eq("site_id", ...)`; errore `return NextResponse.json(err.message)` riga 24. |
| **F-005** | *Non oggetto di questo stream* | — |
| **F-006** | **CONFERMATO** | `app/api/cron/auto-archive/route.ts:22-31` — secret opzionale; `app/api/debug/basic/route.ts:3-8` — “no authentication required”; `createServiceClient` in `app/api/debug/site-lookup/route.ts:40`, `app/api/debug/vercel-env/route.ts:45`, `app/api/debug/database-tables/route.ts:6`. |
| **F-007**–**F-020** | *Non rivalutati in profondità* | F-017 (route duplicate `app/api/api/**`) **CONFERMATO** per `upload` identico; resto lasciato al backlog. |

---

## Quick wins (<=2gg)

- Rendere **obbligatorio** `CRON_SECRET` per `GET/POST` cron (`app/api/cron/auto-archive/route.ts:22-31`).
- Disabilitare o proteggere **tutti** gli handler sotto `app/api/debug/**` fuori dev (stesso pattern per `basic`, `site-lookup`, `vercel-env`, `database-tables`, `user-context`, ecc.).
- Correggere **risposta errore** e aggiungere filtro tenant su `app/api/tasks/route.ts` (o disabilitare la route se legacy).
- Rimuovere/alias una delle due route **upload** duplicate (`app/api/upload/route.ts` vs `app/api/api/upload/route.ts`).

---

## Interventi strutturali (>1 sprint)

- `assertUserCanAccessSite` su **tutte** le route `createServiceClient` che filtrano per `site_id` da header/host.
- Hardening RLS su **Task** e tabelle core kanban/prodotti ancora senza `ENABLE ROW LEVEL SECURITY` nelle migrazioni.
- Riscrittura policy **HR** e **internal_activities** (eliminazione `USING (true)` / `WITH CHECK (true)` dove non sicuro).
- Storage: strategia **non pubblica** o signed URL per documenti e allegati tenant.

---

## Contraddizioni con la roadmap

- La roadmap M1 chiede `assertUserCanAccessSite` sulle route service-role; nel codice **`withSiteAuth` non implementa ancora** quel vincolo (`lib/api/with-site-auth.ts:41-58`) — va aggiornata la definizione di “fatto” per M1 (wrapper vs ogni route).
- KPI “0 endpoint critici senza verifica tenant” non è raggiungibile solo con `getSiteContext` + filtro SQL: serve **membership** esplicita.

---

## Domande aperte per l’utente

- In **produzione**, `Task` ha RLS applicato fuori repo (manuale/console) o lo schema deployato coincide con le migrazioni Git?
- I client chiamano ancora **`/api/api/upload`** o solo `/api/upload`? (per priorità deprecazione.)
- Per **storage**, i file in `files` devono essere pubblici per prodotto (PDF catalogo) o possono passare a signed URL senza impatto UX?

---

**Riferimento finding esistenti (testo originale, non ripetuto qui):** F-001 (`createServiceClient` + header senza membership), F-002 (RLS `Task` da validare), F-004 (`GET /api/tasks` senza `site_id`), F-006 (debug + cron secret opzionale) — come in `docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md:11-16`.
