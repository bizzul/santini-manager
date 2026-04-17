# Ingestione `cursor_exp` — sessione 2026-04-17 (timebox ~45 min)

## Cosa è stato fatto

1. **Copia** di tutti i file `.md` da `~/Desktop/cursor_exp` → `docs/chat-exports/` (41 file).
2. **Redazione segreti** in copia repo (non toccare il Desktop se preferisci tenere l’originale integro):
   - `cursor_site_details_editing.md` (password / connection string)
   - `cursor_github_login_and_push.md` (PAT `ghp_…`)
3. **Documentazione**:
   - `docs/chat-exports/README.md` — origine, sync, avvisi sicurezza
   - `docs/chat-exports/INDEX.md` — indice di tutti i file + mappa batch
   - `docs/chat-exports/SECURITY-SCAN-2026-04-17.md` — log redazioni
   - `docs/CHAT-EXPORTS-MASTER-BACKLOG.md` — backlog unificato chat + audit dati

## Cosa non è stato fatto (prossima run consigliata)

- **Verifica operatività** chat-per-chat (stato `OK`/`PARZIALE`/…) come da `fdm_verification_and_improvement_master.md`: richiede lettura incrociata export ↔ codice e comandi `build`/test.
- **Report batch** `fdm_batch_1_report.md` … `fdm_batch_4_report.md` e piano aggregato `fdm_final_plan.md` (prompt in `fdm_batch_5_aggregator.md`).
- **Run multi-agente “Matt Max”** (7 stream explore + reducer) descritto in `cursor_agente_configurazione_e_analisi.md` → output attesi `STREAM-1..7.md` + `REPORT-FINALE.md` in questa cartella.

## Come proseguire (scegline uno)

### Opzione 1 — Verifica allineata alle tue chat (massima tracciabilità)

Apri 4 chat parallele (o 4 turni sequenziali) con i prompt già pronti in:

- `docs/chat-exports/fdm_batch_1_kanban_projects.md`
- `docs/chat-exports/fdm_batch_2_dashboard_reports.md`
- `docs/chat-exports/fdm_batch_3_hr_timetracking.md`
- `docs/chat-exports/fdm_batch_4_admin_site_deploy.md`

**Modifica obbligatoria:** sostituisci i riferimenti a `Desktop/cursor_exp` con `docs/chat-exports` e fai scrivere i report in `docs/agents-reports/fdm_batch_<N>_report.md`.

Poi esegui il blocco in `fdm_batch_5_aggregator.md` → `docs/agents-reports/fdm_final_plan.md`.

### Opzione 2 — Audit tecnico puro (massima copertura codice)

Esegui i 7 stream read-only sul codebase (security, transazioni, performance, cache, modularità, DX/test, AI/voice) usando come contesto iniziale:

- `docs/AUDIT-ARCH-DATA-*.md`
- `docs/CHAT-EXPORTS-MASTER-BACKLOG.md`

Output: `STREAM-1-security.md` … `REPORT-FINALE.md` in `docs/agents-reports/`.

## Riferimenti operativi esistenti nel repo

- `docs/RELEASE-CHECKLIST-FDM.md`
- `docs/FEATURE-FLAGS.md`
- `docs/AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md` (M1–M4)

## Avviso sicurezza

Se gli export sono mai stati pushati senza redazione, considera la cronologia Git e la rotazione delle credenziali coinvolte.
