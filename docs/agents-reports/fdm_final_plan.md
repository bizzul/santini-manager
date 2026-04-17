# FDM - Piano Finale Verifica + Miglioria

Output richiesto dal prompt `fdm_batch_5_aggregator.md`, adattato ai percorsi in repo (`docs/chat-exports/`, `docs/agents-reports/`). Consolida i 4 batch di verifica chat con i 7 stream di audit codice.

## 1. Stato verifica operativa (tabella globale + 5 priorità)

**Conteggi aggregati dai 4 batch** (24 chat export totali analizzate nel Master):

| Stato | Chat |
|-------|------|
| **OK** | 12 |
| **OK con nota** | 2 |
| **PARZIALE** | 3 |
| **MANCANTE** | 2 |
| **Non verificabile in codice** (Git/deploy/one-shot) | 5 |

*(Stima: stato "OK" include anche le chat B4 dove il deliverable atteso coincide con codice/migration presenti; "Non verificabile" = azioni tipo push/commit, kill processi, login.)*

### Top 5 priorità con maggior impatto business se non operative

1. **Sicurezza multi-tenant** (SEC-A, SEC-B): leak di dati cross-tenant è un rischio esistenziale per un "Data Manager" B2B multi-sito.
2. **Migration `ipg` mancante** (DB-A): l'UI permette di salvare uno stato che il DB può rifiutare → UX rotta e perdita dati su presenze.
3. **Query performance su report e kanban** (PERF-A): payload multi-MB, tempi server elevati, KPI dashboard incoerenti.
4. **Voice API senza membership + billing** (SEC-D, S7-F03): un utente può consumare quota LLM di un altro tenant.
5. **Transazionalità permessi** (TX-A, F-005): validazione superadmin *dopo* il delete lascia permessi persi in caso di errore.

### Regressioni rilevate

- **UI vs DB su `ipg`** (B3): aggiunto in UI/API `attendance-types.ts` ma nessuna migration nel repo → rischio errore Postgres runtime.
- **Overview dashboard** (B2): codice **fortemente diverso** dalla specifica documentata nelle chat `cursor_cambiamento_dashboard_overview.md` e `cursor_fdm_overview_dashboard_layout_re.md` — possibile rollback non documentato.
- **Card compressa Kanban** (B1): codice come `<span>` senza `handleOpenProjectSheet` in `components/kanbans/Card.tsx:1030-1031` ≠ comportamento "card ridotta cliccabile" discusso.
- **Sfondo modali Kanban** (B1): `!bg-background dark:!bg-muted` invece dello `slate-900` discusso in una fase della chat `cursor_leggibilit_sottocategorie_menu_l.md`.

---

## 2. Roadmap migliorie

### Quick win (<= 4h effort, rischio basso)

| Titolo | Area | Impatto | Effort | File | Dipendenze | Test consigliati |
|--------|------|---------|--------|------|------------|------------------|
| Secret scan in CI + `npm run typecheck` | DX | Alto | S | `package.json`, `.github/workflows/ci.yml` | nessuna | eseguire CI su PR di prova |
| `CRON_SECRET` obbligatorio | Deploy/Sec | Alto | S | `app/api/cron/auto-archive/route.ts:22-31` | nessuna | chiamata senza secret → 401 |
| Debug endpoints 404 fuori dev | Sec | Alto | S | `app/api/debug/**` | nessuna | scan staging → 404 |
| Migration `ipg` CHECK | DB/HR | Alto | S | nuova migration `supabase/migrations/` | nessuna | insert `ipg` via POST presenze |
| Rimuovi `console.error` in `kanban/tasks/move/route.ts:39` | DX | Basso | S | stesso file | nessuna | grep `console.` su file |
| `persist key` unica `matris-query-cache-v2` | Cache | Medio | S | `lib/cache-utils.ts`, `app/providers.tsx:72` | nessuna | logout → storage pulito |
| Correggi `GET /api/tasks` filtro `site_id` e shape errore | Sec+API | Alto | S | `app/api/tasks/route.ts:15-24` | nessuna | chiamata cross-tenant → 403 |
| `AbortSignal.timeout` su voice routes | AI | Alto | S | `app/api/voice-input/**` | nessuna | simulare provider lento |
| Dedup `app/api/api/**` con redirect 308 | Mod/Sec | Medio | S | `app/api/api/{upload,confirm,domain}` | nessuna | curl vecchio path → 308 |
| Membership voice API + auth `GET /ai-settings` | Sec | Alto | S | voice routes + `ai-settings/route.ts` | helper membership | test cross-tenant |

### Media complessità (1-2 giorni, rischio medio)

| Titolo | Area | Impatto | Effort | File | Dipendenze | Test consigliati |
|--------|------|---------|--------|------|------------|------------------|
| `assertUserCanAccessSite` centralizzato + usato ovunque | Sec | Alto | M | `lib/api/with-site-auth.ts`, tutte le route service | schema `user_sites` | test unitario + smoke 4-5 endpoint |
| RPC `replace_user_site_permissions` | DB/Sec | Alto | M | migration + `app/api/sites/[domain]/users/[userId]/permissions/route.ts` | RPC migration applicata | test rollback su errore |
| Proiezioni + limit su top 5 endpoint hotlist | Perf | Alto | M | `lib/server-data.ts`, `app/api/kanban/tasks/route.ts`, `reports/time`, `reports/errors`, `snapshot` | query keys factory | snapshot payload bytes |
| Indici compositi su `Task`, `Timetracking`, `Errortracking` | DB/Perf | Alto | S-M | nuova migration | EXPLAIN prima/dopo | benchmark su dataset test |
| Query keys factory + rimuovi tag orfani | Cache | Medio | M | `hooks/use-api.ts`, actions kanban | accordo naming | test invalidation end-to-end |
| Helper `normalizeProductCategoryLabel` unico (già nel report FDM) | UX/Data | Medio | M | `lib/product-category-label.ts` + usi dashboard/grafici | nessuna | screenshot regressione visiva |
| `tabular-report-export.ts` date-only via `formatInTimeZone` | HR/Export | Medio | M | `lib/tabular-report-export.ts` | APP_TIMEZONE costante | export in GMT+0 → stesso giorno |
| Rimuovi gate `eslint.ignoreDuringBuilds` progressivamente | DX | Medio | M | `next.config.js:16-18` | lint backlog pulito | `next build` PASS |
| Prompt voice → modulo condiviso `lib/ai/prompts/` | AI | Basso-Medio | M | `app/api/voice-input/**` | test esistenti comandi | chiamata comando con prompt nuovo |
| Split `app/api/kanban/tasks/route.ts` (board summary vs task detail) | Perf/Mod | Alto | M | handler GET + hook consumer | accordo contratto API | smoke visuale board |

### Alta complessità (settimanale+, rischio alto)

| Titolo | Area | Impatto | Effort | File | Dipendenze | Test consigliati |
|--------|------|---------|--------|------|------------|------------------|
| RLS completa su `Task` e hardening policy HR | Sec/DB | Critico | L | nuove migration + revisione tutte le query client | staging con dati | query cross-tenant → 0 righe |
| RPC transazionali kanban (`duplicate`, `delete`, `move`) | DB | Alto | L | migrations + refactor handler | test integrazione | race test con `k6`/`ab` |
| Billing/usage per-tenant AI | AI/DB | Alto | L | nuova tabella + wrapper LLM | decisione sponsorship | dashboard usage |
| Split `lib/server-data.ts` 5811 righe per dominio | Mod | Alto | L | nuova struttura `src/server/queries/*` | DX-A CI attiva | nessuna regressione dashboard |
| Refactor `editKanbanTask.tsx`/`Card.tsx`/`KanbanBoard.tsx` in feature slice | Mod/UX | Alto | L | nuova `features/kanban/` | split server-data | snapshot UI + regressione kanban |
| Overview dashboard: implementa `DashboardOverviewShell` o chiudi specifica | UX/Mod | Medio | L | `app/sites/[domain]/dashboard/**` | decisione prodotto | screenshot confronto |
| Suite test su 8 endpoint P0 (move, import, cron, permissions, voice) | DX | Alto | L | `__tests__/api/**` + helper mock | CI attiva | coverage gate 30% |
| Storage bucket privati + signed URL | Sec | Medio | L | migrations + upload API | decisione UX | link esterno → 401 |

---

## 3. Release plan Sprint 1 (settimane 1-2)

**Obiettivo:** chiudere tutti i **quick win** e i media-priorità ad alto impatto che non dipendono da architettura.

**Backlog ordinato (max 10):**

1. CI GitHub Actions (DX-A)
2. `CRON_SECRET` obbligatorio + debug endpoint hardening (SEC-C)
3. Migration `ipg` CHECK (DB-A)
4. `AbortSignal.timeout` + membership voice API + auth `GET /ai-settings` (SEC-D)
5. `GET /api/tasks` filtro tenant + shape errore uniforme (parte di F-004)
6. Dedup `app/api/api/**` con redirect (F-017)
7. `persist key` e `console.*` puliti (S4-F019, S6 logging)
8. `assertUserCanAccessSite` centralizzato + adozione primi 10 endpoint service (SEC-A parte 1)
9. Proiezioni + `limit` su `users/list`, `clients`, `products`, `sell-products` (PERF-A parte 1)
10. RPC `replace_user_site_permissions` (TX-A parte 1)

**Criteri di accettazione:**

- CI verde su PR e main.
- `rg "ghp_|postgresql://postgres:" -n` → 0 match.
- Smoke test cross-tenant: utente A non legge dati B sui top 10 endpoint.
- Presenze: salvataggio `ipg` funziona senza errore Postgres.

**Gate release (checklist):**

- [ ] CI verde
- [ ] Nessun secret esposto
- [ ] Smoke test multi-tenant passati
- [ ] Migration applicate su staging e prod
- [ ] Logger senza `console.*` nelle route P0
- [ ] Release notes aggiornate con IDs ticket (SEC-A, SEC-C, DB-A, …)

---

## 4. Release plan Sprint 2 (settimane 3-4)

**Obiettivo:** intervenire su hotlist performance e transazioni critiche; aprire il refactor modulare.

**Backlog ordinato (max 10):**

1. Proiezioni + paginazione top 5 hotlist (kanban/tasks, reports/time, reports/errors, snapshot, quick-actions/data) (PERF-A parte 2)
2. Indici compositi su `Task`, `Timetracking`, `Errortracking` (S3-F005)
3. Query keys factory + rimozione tag orfani + `revalidatePath` tenant-aware (CACHE-A)
4. RPC `duplicate_kanban_tree` e `delete_kanban_safe` (S2-F001, S2-F003)
5. RPC `get_next_internal_sequence_value` con FOR UPDATE (S2-F009)
6. `timetracking_replace_roles` RPC (S2-F004)
7. RLS su `Task` (SEC-B parte 1, in staging prima di prod)
8. Prompt voice centralizzati + primo tracking usage per-tenant (AI scaletto)
9. Split `lib/server-data.ts` primo blocco (dashboard + site-context) (MOD-A parte 1)
10. Test handler su 4 API P0 (move, import CSV, cron, permissions)

**Criteri di accettazione:**

- Payload medio top 5 API **-50%** o più.
- `revalidateTag` orfani = 0.
- Permessi utente: fallimento a metà → stato coerente (test dedicato).
- RLS `Task` attiva in staging senza regressioni funzionali.

**Gate release:**

- [ ] Benchmark documentato (prima/dopo)
- [ ] Test handler su P0 ≥ 4 endpoint
- [ ] Migration RLS verificata su staging con utente non-admin
- [ ] Coverage `collectCoverageFrom` esteso a `app/api/**`
- [ ] Release notes

---

## 5. Dashboard rischi (top 10)

| # | Rischio | Probabilità | Impatto | Mitigazione primaria | Owner suggerito |
|---|---------|-------------|---------|----------------------|-----------------|
| 1 | Leak dati cross-tenant via API service + header spoof | Alta | Alto | `assertUserCanAccessSite` + RLS Task + audit header | Backend Platform Lead |
| 2 | RLS non abilitata su `Task` in produzione | Media | Alto | Verifica `pg_policies` + migration RLS | DBA / Backend Lead |
| 3 | Perdita permessi per rollback parziale (`F-005`) | Media | Medio-Alto | RPC transazionale `replace_user_site_permissions` | Backend Platform Lead |
| 4 | Errore runtime DB su `ipg` presenze | Alta | Medio | Migration CHECK | HR Stream / DBA |
| 5 | Consumo abusivo chiave `OPENAI_API_KEY` globale | Media | Medio-Alto | Membership voice + usage per-tenant | AI/Platform Lead |
| 6 | Debug endpoint / cron aperti in produzione | Media | Alto | Gate env + secret | DevOps / Backend |
| 7 | Cache incoerente (tag orfani, persister key) | Alta | Medio | Bonifica `revalidateTag` + key unica + factory | Frontend Platform |
| 8 | Regressioni silenziose (no CI, no test API) | Alta | Alto | CI + suite minima + typecheck | Engineering Enablement |
| 9 | Import CSV con stato parziale | Media | Medio | Transazione o savepoint per riga | Backend Dominio |
| 10 | Parità locale/online su migrazioni e settings | Media | Medio | Release checklist + `verify:online` in pipeline | DevOps |

---

## 6. Next actions immediate (top 5 entro 24h)

1. **Merge documentazione audit:** pubblicare `docs/agents-reports/REPORT-FINALE.md` + `DELTA-vs-ROADMAP.md` a tutto il team; aprire issue tracker con ID `SEC-A..MOD-A`.
2. **Secret rotation:** revocare PAT GitHub e password DB Supabase che erano in chat (già redatti in repo: `docs/chat-exports/SECURITY-SCAN-2026-04-17.md`).
3. **CI**: aprire PR con workflow YAML proposto in `STREAM-6-dx-testing.md`.
4. **Migration `ipg`**: aprire PR con `20260418_add_ipg_to_attendance_check.sql` per sbloccare UI HR.
5. **Gate `/api/debug/**` e `CRON_SECRET`**: PR single-file per chiudere F-006 / S1-F05 subito.

---

## 7. Appendice: riferimenti batch 1-4

- `docs/agents-reports/fdm_batch_1_report.md` — Kanban & Progetti (6 chat)
- `docs/agents-reports/fdm_batch_2_report.md` — Dashboard & Report (5 chat)
- `docs/agents-reports/fdm_batch_3_report.md` — HR / Timetracking (5 chat)
- `docs/agents-reports/fdm_batch_4_report.md` — Admin / Sito / DB / Deploy / Agenti / Calendar (8 chat)

Sub-report audit codice:

- `STREAM-1-security.md` fino a `STREAM-7-ai-voice.md`

Allineamento con audit preesistente:

- `docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md` (F-001..F-020)
- `docs/AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md` (M1..M4)
- `docs/AUDIT-ARCH-DATA-CHECKLISTS.md` (aree A-F)
