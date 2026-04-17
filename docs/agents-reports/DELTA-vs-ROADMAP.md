# DELTA vs `AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md`

Cosa aggiungono/modificano/contraddicono i nuovi report rispetto alla roadmap M1-M4 del 2026-01 preesistente.

## Sintesi

- **M1 (Hardening immediato)**: oggi **parzialmente incompleto**. `withSiteAuth` (`lib/api/with-site-auth.ts:31-58`) non applica ancora `assertUserCanAccessSite` (Stream 1). Route `app/api/tasks/[taskId]`, `app/api/clients/[clientId]` citate nel backlog F-003 restano da validare. CRON_SECRET e debug endpoint confermati come gap (F-006, S1-F05).
- **M2 (Consistenza transazionale)**: `get_next_sequence_value` **esiste già** come RPC; M2 va inteso come "estendere lo stesso pattern". Nuovi findings (S2-F001..F010) definiscono **10 flussi** non atomici: la lista M2 originale va ampliata (delete kanban, QC/Packing paralleli, duplicate task, import CSV manufacturers, race sequenze interne).
- **M3 (Performance + Cache)**: confermata e specializzata. Aggiunte **hotlist top 20 query** con file:linee, lista **indici candidati**, **5 endpoint senza paginazione** prioritari, e **5 findings nuovi Cache/Realtime** (S4-F019..F023) tra cui il **mismatch persister key** `matris-query-cache` vs `matris-query-cache-v2` non previsto nella roadmap.
- **M4 (Governance + CI)**: YAML CI completo proposto (Stream 6). Aggiunto che **`eslint.ignoreDuringBuilds: true`** in `next.config.js:16-18` rende la build non-gate per lint → la CI proposta compensa.

## Delta per milestone

### Additivi (nuovi deliverable da includere)

- **M1 → aggiungere**: copertura `app/api/voice-input/**` per verifica `siteId` (S7-F06) — non presente nella roadmap.
- **M1 → aggiungere**: migration `ipg` nei CHECK DB (B3) — stato DB behind rispetto a UI.
- **M2 → aggiungere**: RPC `timetracking_replace_roles`, `duplicate_kanban_tree`, `delete_kanban_safe`, `move_task_update_with_action`, `apply_sell_product_import_batch`, `get_next_internal_sequence_value` (Stream 2).
- **M3 → aggiungere**: indici compositi `Task(site_id,archived)`, `Timetracking(site_id,created_at)`, `Errortracking(site_id,updated_at)`.
- **M3 → aggiungere**: unificazione persister key + query keys factory (`queryKeys.*`).
- **M4 → aggiungere**: eliminare `app/api/api/**` (F-017 era low, si alza a medium dato che due route hanno contenuto **identico**: rischio drift concreto).
- **M4 → aggiungere**: policy tipi DB (`types/supabase.ts` vs `types/database.types.ts`) non è solo rinomina file, serve integrazione o scarto (S5-F003).

### Corretti / chiariti

- **M1 KPI "0 endpoint critici senza verifica tenant"**: non raggiungibile solo con `getSiteContext` + filtro SQL, serve **membership esplicita** (Stream 1 contraddizione).
- **M3 "revalidateTag allineati a producer reali"**: specificare che oggi `kanbans` e `kanban-categories` sono **orfani** — va deciso se creare i producer `unstable_cache` o rimuovere i tag.

### Fuori roadmap esistente (domini nuovi)

- **AI/Voice stream completo** (Stream 7): timeout, billing per-tenant, prompt centralization, `GET /ai-settings` senza auth, memoria `Map` in-process. La roadmap non li copriva.
- **Modularità architetturale** (Stream 5): target feature-slice con policy di import e diagramma Mermaid. La roadmap parlava di tipi e duplicati migration, non di target architecture.
- **Verifica chat export** (Batch 1-4): 4 aree con stato **OK/PARZIALE/MANCANTE** per ciascuna chat. Alcune richieste (es. `DashboardOverviewShell`) non sono mai state implementate pur essendo documentate come fatte.

## Aggiornamento priorità suggerito

Ordine consigliato rispetto all'originale:

1. **DX (nuova priorità alta M0)**: CI prima di qualsiasi refactor, per avere gate oggettivo.
2. **M1 hardening** ampliato con voice + CHECK DB + membership centralizzata.
3. **M2 transazioni** con lista RPC estesa.
4. **M3 performance + cache** con hotlist e mismatch persister.
5. **M4 governance** con target architecture, rimozione `app/api/api/**`, unica sorgente tipi DB.
