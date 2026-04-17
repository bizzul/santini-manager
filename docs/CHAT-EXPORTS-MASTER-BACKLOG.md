# Backlog master: export chat + audit architettura dati

Documento di sintesi che **unisce** le priorità emerse da `docs/chat-exports/` (in particolare `fdm_report_stato_e_piano.md` e la mappa batch) con il backlog tecnico in `docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md`.

## Principio di priorità

1. **Sicurezza e tenant (P0 audit)** — blocca data leak e superficie d’attacco.
2. **Parità locale/online e contratti dati** — riduce incidenti ricorrenti dalle chat.
3. **Coerenza UI/HR/Kanban** — dopo che i dati e l’auth sono stabili.
4. **Modularità e DX** — refactor strutturale quando il rischio regressione è controllato.

## Traccia A — Audit dati (fonte: `AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md`)

| ID | Voce | Nota |
|----|------|------|
| F-001 … F-007 | P0 | Implementare secondo `AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md` milestone **M1** |
| F-008 … F-015 | P1 | M2/M3/M4 a seconda dell’area (cache, query, CI) |
| F-016 … F-020 | P2 | Governance schema, duplicati API, logging |

Quick wins già elencati nel backlog audit: route mancanti `tasks/[taskId]` e `clients/[clientId]`, shape errori, `CRON_SECRET`, `/api/debug/**`, `revalidatePath`, deprecazione `local-upload`.

## Traccia B — Pattern dalle chat (fonte: `fdm_report_stato_e_piano.md`)

| Tema | Perché è ricorrente | Azione consigliata |
|------|---------------------|-------------------|
| Locale vs online | storage, env, feature flag, deploy non allineato | Completare e usare `docs/RELEASE-CHECKLIST-FDM.md` + `docs/FEATURE-FLAGS.md` ad ogni rilascio |
| Query/join Supabase fragili | KPI vuoti, numeri dashboard incoerenti | Smoke su endpoint dashboard/report; allineare a Traccia A (proiezioni, tenant) |
| Date/timezone | mismatch export e UI | Piano “date-only” citato nel report FDM; incrocia F-010 e serializzazioni |
| Duplicazione Kanban/progetti | `editKanbanTask` / form progetti | Estrazione componenti condivisi (medio termine) |
| Toolchain | lint/build, processi su porta | Pre-commit `tsc --noEmit` + `next lint`; script kill porta documentato |
| Segreti in chat | PAT/password in export | Policy: `SECURITY-SCAN-*.md` + revoca token/password esposti |

## Traccia C — Verifica “cosa le chat hanno chiesto vs cosa c’è nel repo”

Il piano `fdm_verification_and_improvement_master.md` definisce per ogni chat uno stato atteso: `OK` / `PARZIALE` / `MANCANTE` / `REGRESSIONE`.

**Prossimo passo operativo (non eseguito in questa sessione):** eseguire i 4 batch (o un singolo agente in 45 min) che producono:

- `docs/agents-reports/fdm_batch_1_report.md` … `fdm_batch_4_report.md`
- poi il prompt in `fdm_batch_5_aggregator.md` → `docs/agents-reports/fdm_final_plan.md`

Aggiornare i path nei prompt da `Desktop/cursor_exp` a `docs/chat-exports` per coerenza con il repo.

## Ordine suggerito “prossime 2 settimane”

**Settimana 1**

- Chiudere **M1** audit (F-001–F-007 dove applicabile).
- Rotazione credenziali se esposte negli export (vedi `docs/chat-exports/SECURITY-SCAN-2026-04-17.md`).
- Helper unico categorie prodotto / reset preferenze Kanban (quick win dal report FDM).

**Settimana 2**

- Smoke test mirati (`fetchDashboardData`, export ore, kanban tasks, attendance) come da `fdm_report_stato_e_piano.md`.
- Avviare **M2** (transazioni) su replace permessi e move task.
- Eseguire verifica batch chat → report in `docs/agents-reports/`.

## Riferimenti

- Export e indice: `docs/chat-exports/README.md`, `docs/chat-exports/INDEX.md`
- Roadmap dati: `docs/AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md`
- Checklist audit: `docs/AUDIT-ARCH-DATA-CHECKLISTS.md`
