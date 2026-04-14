# Audit Architettura Dati - Findings Backlog

Classificazione:
- Severity: `critical`, `high`, `medium`, `low`
- Effort: `S` (<=2 giorni), `M` (1 sprint), `L` (>1 sprint)

## Priorita P0 (critical/high)

| ID | Area | Finding | Severity | Effort | Evidenze |
|---|---|---|---|---|---|
| F-001 | B | Uso `createServiceClient` con contesto sito da header senza verifica membership utente-sito in varie API. | critical | M | `app/api/suppliers/route.ts`, `app/api/reports/tasks/route.ts`, `lib/site-context.ts`, `lib/api/with-site-auth.ts` |
| F-002 | B | Possibile copertura RLS incompleta su tabelle sensibili (`Task` da validare su DB reale). | critical | M | `supabase/migrations/202507101310_schema_progetto_a.sql` |
| F-003 | D | Route client referenziate ma non implementate: `/api/tasks/[taskId]` e `/api/clients/[clientId]`. | high | S | `hooks/use-api.ts`, `components/tasks/edit-modal.tsx`, `components/clients/edit-modal-form.tsx`, assenza handler in `app/api/tasks/[taskId]` e `app/api/clients/[clientId]` |
| F-004 | D | `GET /api/tasks` senza filtro tenant esplicito (`site_id`) e shape errore non uniforme. | high | S | `app/api/tasks/route.ts` |
| F-005 | C | Replace permessi utente `delete+insert` senza transazione: stato parziale su errore. | high | M | `app/api/sites/[domain]/users/[userId]/permissions/route.ts` |
| F-006 | F | Endpoint debug esposti e cron con secret opzionale: rischio operativo in produzione. | high | S | `app/api/debug/**`, `app/api/cron/auto-archive/route.ts` |
| F-007 | D | `local-upload` scrive su filesystem locale (`public/`) non adatto a serverless. | high | M | `app/api/local-upload/[subfolder]/route.ts` |

## Priorita P1 (medium)

| ID | Area | Finding | Severity | Effort | Evidenze |
|---|---|---|---|---|---|
| F-008 | E | `revalidatePath` spesso non allineato a path tenant reali (`/sites/[domain]/...`). | medium | S | `app/sites/[domain]/**/actions/*.ts` |
| F-009 | E | `revalidateTag("kanbans"/"kanban-categories")` senza cache taggata corrispondente. | medium | S | `app/sites/[domain]/kanban/actions/*.action.ts`, `lib/fetchers.ts` |
| F-010 | C | Query pesanti con `select("*")` in API e aggregazioni server. | medium | M | `lib/server-data.ts`, `app/api/kanban/tasks/route.ts`, `app/api/clients/route.ts` |
| F-011 | C | Flussi multi-step non atomici (update+audit, duplicate kanban, import batch). | medium | M | `app/api/inventory/uniqueId/[id]/route.ts`, `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts`, `app/api/sell-products/import-csv/route.ts` |
| F-012 | A | Config seed Supabase punta a file da verificare (`seed.sql`). | medium | S | `supabase/config.toml` |
| F-013 | A | Duplicazioni migration tree fuori path canonico generano rischio drift. | medium | S | `supabase-sellproduct-patch/supabase/migrations`, `.tmp-safe-migration/supabase/migrations` |
| F-014 | F | Nessuna pipeline CI versionata per gate automatici `lint/test/build`. | medium | M | assenza `.github/workflows` |
| F-015 | F | Test coverage non include API route handler critici. | medium | M | `jest.config.js`, `__tests__` |

## Priorita P2 (low)

| ID | Area | Finding | Severity | Effort | Evidenze |
|---|---|---|---|---|---|
| F-016 | A | Doppio sistema di tipi DB (`types/database.types.ts` vs `types/supabase.ts`) potenzialmente divergente. | low | M | `types/database.types.ts`, `types/supabase.ts` |
| F-017 | D | Route duplicate sotto `app/api/api/**` aumentano costo manutenzione. | low | S | `app/api/api/upload/route.ts`, `app/api/upload/route.ts` |
| F-018 | E | Incoerenza query keys (`kanban-categories` con/senza domain). | low | S | `components/kanbans/KanbanCategoryManagerModal.tsx`, `components/app-sidebar.tsx` |
| F-019 | F | Logging non uniforme (`logger` e `console.*` misti). | low | S | `lib/logger.ts`, `app/api/kanban/tasks/move/route.ts` |
| F-020 | A | Naming schema misto (PascalCase/snake_case) complica policy e query. | low | L | migrazioni su `Task` e tabelle `snake_case` |

## Quick Wins consigliati (prima tranche)

1. Implementare route mancanti `clients/[clientId]` e `tasks/[taskId]` con auth tenant.
2. Uniformare shape errori API (`{ error, code }`) in tutte le route.
3. Rendere `CRON_SECRET` obbligatorio e bloccare `/api/debug/**` fuori dev.
4. Correggere `revalidatePath` verso path tenant reali.
5. Rimuovere/deprecare `local-upload` a favore storage persistente.

## Interventi strutturali (tranche successive)

1. Centralizzare autorizzazione tenant (`assertUserCanAccessSite`) in tutte le API service-role.
2. Hardening RLS completo e verifica automatica policy coverage per tabelle tenant.
3. Introdurre RPC transazionali per operazioni multi-step ad alto rischio.
4. Ridurre `select("*")` e introdurre paginazione/limit per endpoint pesanti.
5. Estendere test automatici su API critiche e integrare pipeline CI.
