# Audit Architettura Dati - Roadmap Ottimizzazione

Roadmap derivata dal backlog findings, ordinata per impatto e rischio.

## Obiettivi

- Ridurre rischio data leak multi-tenant.
- Aumentare consistenza dati su operazioni multi-step.
- Ridurre latenza e payload query pesanti.
- Rendere stabile il ciclo di rilascio con test e gate automatici.

## Milestone

## M1 - Hardening immediato (1 settimana)

Scope:
- Bloccare le vulnerabilita ad alta priorita e sistemare i contratti API rotti.

Deliverable:
- Introdurre guard centralizzata `assertUserCanAccessSite(userId, siteId)` e applicarla alle route con `createServiceClient`.
- Aggiungere route mancanti:
  - `app/api/tasks/[taskId]/route.ts`
  - `app/api/clients/[clientId]/route.ts`
- Uniformare error contract API (`{ error, code, details? }`) e adattare `hooks/use-api.ts`.
- Rendere obbligatorio `CRON_SECRET` in `app/api/cron/auto-archive/route.ts`.
- Limitare o disabilitare `app/api/debug/**` fuori ambiente sviluppo.
- Deprecare `app/api/local-upload/[subfolder]/route.ts` e consolidare su storage persistente.

KPI:
- 0 endpoint critici accessibili senza verifica tenant.
- 0 chiamate client a route non esistenti.
- 100% route cron/debug con protezione ambiente.

## M2 - Integrita e consistenza transazionale (1 sprint)

Scope:
- Eliminare stati parziali nelle operazioni business critiche.

Deliverable:
- Introdurre RPC SQL transazionali per:
  - replace permessi utente-sito (`permissions`).
  - move task con side effects critici.
  - import batch (sell products e import CSV principali).
- Ridurre flussi `delete+insert` o `update+audit` non atomici.
- Definire pattern comune retry/rollback per errori parziali lato API.

KPI:
- Riduzione errori da stato parziale nelle route critiche.
- Copertura test su flussi transazionali principali.

## M3 - Performance query e cache coherence (1 sprint)

Scope:
- Ridurre costo query e inconsistenze cache/revalidate.

Deliverable:
- Sostituire `select("*")` con proiezioni esplicite in `lib/server-data.ts` e API ad alto volume.
- Aggiungere paginazione/limit su endpoint lista pesanti.
- Riallineare tutti i `revalidatePath` ai path tenant reali (`/sites/[domain]/...`).
- Allineare `revalidateTag` ai producer reali di cache taggata o rimuovere tag inutili.
- Uniformare query keys TanStack tra hooks, realtime, invalidazioni.

KPI:
- Riduzione payload medio API principali.
- Riduzione mismatch cache/realtime segnalati.

## M4 - Governance schema e quality gates (1 sprint)

Scope:
- Stabilizzare evoluzione DB e quality control continuo.

Deliverable:
- Definire un solo source of truth per migration tree (solo `supabase/migrations`).
- Verificare e allineare seed config (`supabase/config.toml`) e asset seed.
- Standardizzare strategia tipi DB (`types/database.types.ts` + policy aggiornamento).
- Introdurre CI con gate `lint`, `test`, `build`.
- Espandere test su `app/api/**/route.ts` per flussi critici (task move, import CSV, upload, cron, admin).

KPI:
- 100% PR con pipeline automatica.
- Copertura minima concordata sui flussi critici API.

## Stream operativi

### Stream 1 - Security/Tenant
- Owner: backend platform.
- Include: M1 + parti sicurezza M4.

### Stream 2 - Data Consistency
- Owner: domain backend.
- Include: M2.

### Stream 3 - Performance/Cache
- Owner: fullstack core.
- Include: M3.

### Stream 4 - Quality/Operations
- Owner: engineering enablement.
- Include: M4 + hardening osservabilita.

## Sequenza di esecuzione consigliata

1. Eseguire M1 per rimuovere rischi immediati.
2. Avviare in parallelo M2 (consistenza) e M3 (performance) dopo hardening base.
3. Chiudere con M4 per consolidare processo e prevenire regressioni.
