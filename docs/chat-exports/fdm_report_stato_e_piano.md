# FDM - Report stato tecnico e piano operativo

Generato automaticamente al termine dell'esecuzione batch del prompt operativo.

---

## Stato tecnico

- Branch: `main`
- Allineamento remoto: `origin/main` (nessun ahead/behind)
- Modifiche: nessuna traccia modifica tracciata; unica voce `?? .cursor/` (file di configurazione locale, intenzionale)
- Diff staged/unstaged: vuoto
- Ultimi 8 commit:
  1. `205d808` Menu azioni agenti virtuali + modifica profilo/avatar
  2. `1795100` Fix build prod, tipo hydration sito con logo opzionale
  3. `db2ed73` Ripristino pulsante configurazione campi card kanban
  4. `50c7983` Modifica chat agenti
  5. `7ee85f5` Installing leaflet
  6. `dda508d` Resilienza azioni kanban/progetti verso Supabase query
  7. `14fd6a0` Allineamento locale->online e risorsa video
  8. `0f7a14e` Fix build prod: type guard dialog collaboratori
- Build: **PASS** (`npm run build`, 26s, tutte le rotte generate, nessun errore)

---

## Analisi richieste passate (cursor_exp)

- File totali presenti: **32**
  - Chat storiche `cursor_*`: **24**
  - File operativi FDM (`fdm_*`): **6**
  - Prompt batch (`cursor_exp_batch_*`): **1**
  - Report (questo file): **1** (nuovo)

### Top 10 richieste ricorrenti
1. Allineare locale vs online (codice deploy, localStorage, env flag)
2. Layout/modali progetti e Kanban (colonne 50/50, uniformita')
3. Dashboard Overview (layout fisso, KPI, refactor/rollback)
4. Report/export (filtri uniformi, export coerente)
5. Timetracking + Presenze (HR rules, export, utenti corretti)
6. Navigazione e permessi progetto (consuntivo solo admin, scheda unica)
7. Kanban: card, ordinamento, campi visibili, sync preferenze
8. Admin sito / impostazioni (blocchi, tema, assistenza)
9. Git: push, permessi, rollout graduale (cherry-pick, branch)
10. Date/timezone e categorie Supabase (array vs scalare)

### Top 5 incidenti/blocchi ricorrenti
1. Divergenza locale/online oltre Git (storage, env, feature flag)
2. Query/join Supabase fragili -> dataset vuoti / KPI incoerenti
3. Constraint DB vs UI (presenze/IPG): UI avanti rispetto al DB
4. Toolchain (ESLint/terminale non interattivo, sandbox uccisione processi)
5. Rollout/cherry-pick: conflitti e migration duplicate

### Top 5 azioni preventive
1. Checklist pre-release (stesso commit staging/prod, confronto screenshot, env equivalenti)
2. Contratto dati "date-only" (YYYY-MM-DD o `date` in DB) con audit delle serializzazioni
3. Smoke test automatici su `fetchDashboardData`, export report, attendance post-migration
4. Policy Git (no token in chat, PAT scope minimo, rotazione credenziali)
5. Una sola funzione di normalizzazione categoria/join Supabase riusata ovunque

### 5 aree di debito tecnico
1. Modelli data/ora e timezone server
2. Accoppiamento UI <-> schema DB (enum/check)
3. Duplicazione logica Kanban/progetti (`editForm`, `editKanbanTask`, tabelle)
4. Affidabilita' toolchain (lint TS inconsistente)
5. Segreti e permessi (PAT esposti, 403 su repo org)

### 3 quick win
1. Documentare flag gia' esistenti per parita' locale/prod
2. Helper unico per label categoria prodotto (array/string) riusato in dashboard e grafici
3. Bottone "Reset preferenze Kanban" per evitare falsi bug di sync

---

## Comandi eseguiti

- `git status --short --branch` -> `## main...origin/main` + `?? .cursor/`
- `git log -8 --oneline` -> 8 commit mostrati (OK)
- `git diff --staged --stat` -> vuoto
- `git diff --stat` -> vuoto
- `npm run build` -> **PASS** in 26s

---

## Piano operativo FDM

### Immediate (oggi)
- Commit/push file operativi FDM in `Desktop/cursor_exp` nel repo (se si vuole condividerli col team) oppure lasciare in storage personale
- Aggiungere bottone/script "Reset preferenze Kanban" lato client
- Introdurre helper unico `normalizeProductCategoryLabel` in `lib/` e sostituire accessi puntuali nei grafici Produzione e Dashboard

### Breve termine (settimana)
- Smoke test automatizzati su:
  - `GET /api/reports/time` (export ore)
  - `GET /api/kanban/tasks` (lista+filtri)
  - `POST /api/tasks/[id]/patch` (update campi nuovi)
  - `GET /api/attendance/*` (post-migrazioni)
- Introduzione lint TS obbligatorio in pre-commit (`npx tsc --noEmit` + `next lint`) con fallback documentato
- Documento `docs/RELEASE-CHECKLIST-FDM.md` con passi: push, deploy, migrazione DB, verifica online, hard refresh
- Rotazione PAT GitHub e pulizia storici chat da eventuali token

### Medio termine (mese)
- Consolidamento contratto data-only (YYYY-MM-DD) su tutto il codice task/progetto con test dedicati
- Riduzione duplicazione `editForm` vs `editKanbanTask` (estrazione componenti condivisi: Info Cantiere, Storico, Collaboratori, Documenti)
- Introduzione feature flag chiari e condivisi per layout alternativi dashboard
- Script `npm run verify:online` che esegue smoke remoto su ambiente target post-deploy
- Audit policy segreti/permessi repo org e adozione GitHub Environments per i deploy

---

## Note finali

- La configurazione CLI in `.cursor/cli.json` (progetto) e `~/.cursor/cli-config.json` (utente) abilita modalita' auto-approvazione (`unrestricted`) + `maxMode: true` per ridurre interruzioni operative.
- La Unblock Policy in `fdm_unblock_policy.md` e' integrata nel prompt batch (`cursor_exp_batch_analysis_and_bootstrap_prompt.md`), garantendo ripresa automatica su almeno 5 chat casuali in caso di stallo.
