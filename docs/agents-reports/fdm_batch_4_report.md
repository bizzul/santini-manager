# Batch 4 Report — Admin / Sito / DB / Deploy / Agenti / Calendar

## Sintesi (tabella 8 righe)

| Chat | Area | Stato | Note |
|------|------|-------|------|
| `cursor_dettagli_sito_e_gestione_utenti.md` | Admin sito, users, BOT | OK | `EditSiteForm`, `max-w-7xl`, `SiteThemeSettingsModal`, `SiteSupportAndSubscriptionModal`, `support_bot_enabled`, "Dashboard utente (beta)" presenti |
| `cursor_site_details_editing.md` | Site settings PDF-aligned | OK | `Product/Factory/Hr/AiSettingsModal` + `lib/site-settings-guides.ts` + migrazione `20260404123000_extend_sellproduct_categories_for_settings.sql` |
| `cursor_controllo_architettura_database.md` | Docs audit DB | OK | `docs/AUDIT-ARCH-DATA-{CHECKLISTS,FINDINGS-BACKLOG,OPTIMIZATION-ROADMAP}.md` presenti |
| `cursor_virtual_agent_chat_modifications.md` | Assistenza + Overview | OK | `GlobalSupportAssistant` senza auto-apertura su `pathname`, saluti distinti via `getAssistantMeta`, `fetchDashboardData` con lookup separati + `console.error/warn` diagnostici |
| `cursor_missing_online_changes_with_mit.md` | Allineamento remoto (Git) | PARZIALE | Commit `14fd6a0` ("Allinea le modifiche locali di amministrazione e moduli sito...") + `205d808` ecc. presenti; branch locale `ahead 1` su `origin/main`, quindi parità non ancora totale |
| `cursor_github_login_and_push.md` | Auth GitHub + fix presenze | OK | `supabase/migrations/20260305100000_fix_attendance_status_check.sql` coerente; nessun PAT reale in repo (solo regex/doc) |
| `cursor_weekly_calendar_view_redesign.md` | `components/calendar/*` | OK | `WeeklyCalendarView.tsx` include `CalendarTimeGrid`+`CalendarProjectCard`; integrato in `calendarComponent.tsx`, `AttendanceGrid.tsx`, `timeTracking/create-page.tsx`, `app/sites/[domain]/timetracking/dataWrapper.tsx` |
| `cursor_process_termination_on_ports_300.md` | Kill porte 3000/3001 | PARZIALE | `docs/DEV-TROUBLESHOOTING.md §1` documenta `lsof\|kill -9`; nessuno script dedicato in `scripts/` (es. `scripts/kill-ports.sh` o npm script) |

Legenda: **OK** = allineato nel codice, **PARZIALE** = parzialmente riflesso/documentato, **MANCANTE** = non presente, **REGRESSIONE** = peggiorato.

---

## Dettaglio per chat

### 1. `cursor_dettagli_sito_e_gestione_utenti.md` — OK
- **Atteso**: `EditSiteForm` con blocchi A/B (logo, dati base, Users), larghezza `max-w-7xl`, tema spostato in "Impostazioni" con modal, card "Assistenza e abbonamenti", flusso BOT + toggle superadmin `support_bot_enabled`, sezione "Dashboard utente (beta)" su `/administration/users/[id]`.
- **Verifica codice**:
  - `app/(administration)/administration/sites/[id]/edit/EditSiteForm.tsx` presente.
  - `app/(administration)/administration/sites/[id]/edit/page.tsx` usa `max-w-7xl` e legge `support_bot_enabled`.
  - `components/site-settings/{SiteThemeSettingsModal,SiteSupportAndSubscriptionModal,SettingsOverviewCards,SiteThemeColorsConfigurator}.tsx` presenti.
  - `app/(administration)/administration/users/[id]/page.tsx` contiene "Dashboard utente (beta)".
- **Esito**: Allineato.

### 2. `cursor_site_details_editing.md` — OK
- **Atteso**: Allineamento a PDF (spazi, logo, card impostazioni, modali Prodotti/Fabbrica/HR, avatar, migrazione `sellproduct_categories`, API/guide).
- **Verifica codice**:
  - `components/site-settings/{ProductSettingsModal,FactorySettingsModal,HrSettingsModal,AiSettingsModal,InventoryCategoryManagerModal,KanbanCategoryManagerModal,CodeTemplatesModal,SettingsHelpButton}.tsx` presenti.
  - Migrazioni: `supabase/migrations/20260404123000_extend_sellproduct_categories_for_settings.sql`, `20260408170000_extend_sellproduct_form_fields.sql`, `20260408173000_add_sellproduct_tipo.sql`.
  - `lib/site-settings-guides.ts` espone chiavi `products`, `factory`, `hr`, `theme`, `support`.
- **Esito**: Allineato.

### 3. `cursor_controllo_architettura_database.md` — OK
- **Atteso**: Tre documenti audit DB in `docs/`.
- **Verifica codice**: `docs/AUDIT-ARCH-DATA-CHECKLISTS.md`, `docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md`, `docs/AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md` tutti presenti.
- **Esito**: Allineato.

### 4. `cursor_virtual_agent_chat_modifications.md` — OK
- **Atteso**: chat che non si apre al cambio pagina, saluti distinti Vera/Aura/Mira, `fetchDashboardData` con fetch separate e diagnostica, fix tipi build.
- **Verifica codice**:
  - `components/assistance/GlobalSupportAssistant.tsx`: `setOpen(true)` solo su handler dell'evento `open-support-assistant` (riga 148) e su click avatar (riga 203); nessun `setOpen(true)` legato a `pathname`.
  - Saluti costruiti via `getAssistantMeta(activeAssistant).label` (riga 131).
  - `lib/server-data.ts` `fetchDashboardData` (riga 1727): log strutturati su tutte le query (Kanban, Task, Category, user_sites, KanbanColumn, historical tasks) + `console.warn` su dataset Task vuoto.
- **Esito**: Allineato.

### 5. `cursor_missing_online_changes_with_mit.md` — PARZIALE
- **Atteso**: commit/push di allineamento (es. `public/video/dna-loop.mp4`) per parità locale/online.
- **Verifica codice**:
  - `git log -20 --oneline` mostra commit coerenti con l'intento: `14fd6a0 Allinea le modifiche locali di amministrazione e moduli sito per pubblicare online...`, oltre a `77967ed`, `1e335e8`.
  - `git status --short --branch` dopo `git fetch`: **`## main...origin/main [ahead 1]`** → il branch locale ha 1 commit non pushato; inoltre ~11 file tracciati risultano modificati e non committati (es. `app/api/debug/*/route.ts`, `lib/cache-utils.ts`, `package.json`).
- **Esito**: Parziale. L'intento è tracciato a livello di commit passati, ma la parità locale/remoto **non è raggiunta al momento del report** (ahead 1 + diff pendenti).

### 6. `cursor_github_login_and_push.md` — OK (codice) / Non verificabile (Git remoto)
- **Atteso**: push post-login PAT; fix constraint `attendance_entries`.
- **Verifica codice**: `supabase/migrations/20260305100000_fix_attendance_status_check.sql` esegue `DROP CONSTRAINT` / `ADD CONSTRAINT` coerente. È presente anche la migrazione successiva `20260418090000_add_ipg_to_attendance_checks.sql` (evoluzione della stessa area).
- **Sicurezza**: nessun PAT reale trovato. Tutte le occorrenze `ghp_*` sono regex di CI (`.github/workflows/ci.yml`), snippet di rule (`.cursor/rules/no-secrets.mdc`) o doc (`SECURITY-PLAYBOOK.md`, `INGEST-CURSOR-EXP-2026-04-17.md`, chat-export già redatta).
- **Esito**: Fix DB presente; azione Git passata non riproducibile dal codice.

### 7. `cursor_weekly_calendar_view_redesign.md` — OK
- **Atteso**: `WeeklyCalendarView`, `CalendarTimeGrid`, `CalendarProjectCard`, drawer dettaglio, integrazione calendari/timetracking/presenze.
- **Verifica codice**:
  - `components/calendar/WeeklyCalendarView.tsx` importa `CalendarProjectCard` (riga 30), definisce ed esporta `CalendarTimeGrid` (riga 519), usa `CalendarProjectCard` nelle griglie (righe 644, 687).
  - Riuso in `components/calendar/calendarComponent.tsx`, `components/calendar/MonthlyCalendarView.tsx`, `components/attendance/AttendanceGrid.tsx`, `components/timeTracking/create-page.tsx`, `app/sites/[domain]/timetracking/dataWrapper.tsx`.
  - Drawer in `components/calendar/ProjectOrSiteDetailDrawer.tsx`.
- **Esito**: Allineato.

### 8. `cursor_process_termination_on_ports_300.md` — PARZIALE
- **Atteso**: procedura per liberare porte 3000/3001.
- **Verifica codice**:
  - `docs/DEV-TROUBLESHOOTING.md §1 "Porte dev occupate (3000/3001)"` documenta `lsof -ti tcp:3000 | xargs kill -9 || true` e analogo per 3001.
  - Nessuno script dedicato in `scripts/` (es. `scripts/kill-ports.sh`) né npm script `dev:reset` / `dev:free-ports` in `package.json`.
- **Esito**: Parziale — procedura documentata ma non scriptata.

---

## Smoke check statici

### `git log -20 --oneline`
```
b19061c Aggiunge guide operative FDM e script verify online.
0b6ec7b Aggiunge checklist di release FDM e test unitari helper categoria prodotto.
70a6686 Centralizza normalizzazione categoria prodotto e aggiungi reset preferenze kanban.
205d808 Aggiunge il menu azioni anche agli agenti virtuali nella tabella Collaboratori...
1795100 Sblocca la build di produzione aggiornando il tipo di hydration del sito...
db2ed73 Ripristina il pulsante di configurazione dei campi card nella barra filtri del kanban...
50c7983 Modifica chat agenti
7ee85f5 installing leaflet
dda508d Rende resilienti le action kanban/progetti rispetto alle varianti delle query Supabase...
14fd6a0 Allinea le modifiche locali di amministrazione e moduli sito per pubblicare online...
0f7a14e Sblocca la build di produzione correggendo i type guard del dialog collaboratori...
9a3eb70 Implement assistant runtime orchestration and collaborator-style agent management.
af94f24 Introduce assistants foundation, multi-avatar support, and UI cleanup.
5ab0184 Riposiziona e ingrandisce l'avatar di Vera...
23a36f9 Rende stabile l'avatar di Vera in produzione...
a3bc247 Aggiorna l'avatar di Vera con l'immagine condivisa...
e13a5ca Estende la gestione assistenza utenti e i controlli permessi...
77967ed Allinea quick actions e dashboard progetto, ampliando anche le impostazioni sito.
1e335e8 Allinea la UI progetto tra locale e produzione mantenendo i flussi.
533c3dd Modifiche visualizzazione container, dash forecast
```

### `git status --short --branch` (dopo `git fetch`)
```
## main...origin/main [ahead 1]
 M app/api/cron/auto-archive/route.ts
 M app/api/debug/basic/route.ts
 M app/api/debug/database-tables/route.ts
 M app/api/debug/kanbans/route.ts
 M app/api/debug/site-flow/route.ts
 M app/api/debug/site-lookup/route.ts
 M app/api/debug/site-navigation/route.ts
 M app/api/debug/user-context/route.ts
 M app/api/debug/vercel-env/route.ts
 M app/api/kanban/tasks/move/route.ts
 M app/providers.tsx
 M lib/cache-utils.ts
 M package.json
?? .cursor/cli.json
?? .github/
?? docs/CHAT-EXPORTS-MASTER-BACKLOG.md
?? docs/agents-reports/
?? docs/chat-exports/
?? lib/api/debug-guard.ts
?? lib/cache-keys.ts
?? supabase/migrations/20260418090000_add_ipg_to_attendance_checks.sql
```

Note:
- `git fetch` eseguito (solo fetch). Branch locale `main` è **ahead 1** rispetto a `origin/main` → esiste un commit locale non ancora pushato.
- Parecchi file modificati non committati, in particolare sotto `app/api/debug/*` e `lib/cache-utils.ts`: probabile refactor di hardening debug endpoint (presente anche il nuovo `lib/api/debug-guard.ts` untracked).
- Nuova migrazione Supabase `20260418090000_add_ipg_to_attendance_checks.sql` ancora untracked.

### `rg "ghp_|github_pat_|sk_live_|sk_test_|service_role"`
Nessun token reale individuato. Le occorrenze sono tutte **pattern o placeholder**:
- `.github/workflows/ci.yml` (righe 60–63): regex di scan segreti nella pipeline CI.
- `.cursor/rules/no-secrets.mdc` (righe 11, 32): testo della regola stessa.
- `docs/SECURITY-PLAYBOOK.md`, `docs/VERCEL_ENVIRONMENT_SETUP.md`, `docs/VERCEL_DEPLOYMENT.md`: placeholder `your_service_role_key_here` e linee guida.
- `docs/chat-exports/SECURITY-SCAN-2026-04-17.md`, `docs/chat-exports/README.md`, `docs/chat-exports/fdm_batch_4_admin_site_deploy.md`, `docs/agents-reports/INGEST-CURSOR-EXP-2026-04-17.md`, `docs/agents-reports/STREAM-6-dx-testing.md`, `docs/agents-reports/fdm_final_plan.md`: riferimenti documentali / teaser già redatti (`ghp_…`).
- `supabase/migrations/*`: riferimenti a `service_role` nelle policy RLS (uso legittimo, non sono chiavi).

### Build/Test
**Non eseguiti** per scelta: il terminale 1 sta eseguendo `npm run dev` (vedi `terminals/1.txt`, comando attivo). Avviare `npm run build` o `npm test` in parallelo potrebbe interferire con cache `.next` e occupare porte. La verifica build/test è demandata alla pipeline CI (`.github/workflows/ci.yml`) e/o a una successiva finestra in cui il dev server non è attivo.

---

## Piano miglioria

### Quick win
- **`docs/DEV-TROUBLESHOOTING.md` (già esistente)**: aggiungere sezione "Reset preferenze utente in localStorage" (chiavi `kanban-*`, `assistant-*`, `site-theme-*`) e comandi `rm -rf .next` + `npm cache clean --force`. File: `docs/DEV-TROUBLESHOOTING.md`.
- **Script `scripts/kill-ports.sh`** + npm alias `"dev:reset": "bash scripts/kill-ports.sh && rm -rf .next"` in `package.json` per automatizzare il workflow documentato per 3000/3001.
- **Template GitHub issue/PR**: creare `.github/ISSUE_TEMPLATE/bug.yml` + `feature.yml` e `.github/PULL_REQUEST_TEMPLATE.md` con sezione obbligatoria **Impact area** (`UI / API / DB / Deploy / Docs`) e checklist migrazioni/smoke test. Oggi esiste solo `.github/workflows/ci.yml`.
- **`.cursor/rules/no-secrets.mdc` (già esistente)**: appendere un blocco "Se trovi `ghp_*` nei diff, NON committare e apri task di revoca" per standardizzare il comportamento dell'agente.

### Media
- **Refactor `fetchDashboardData` in `lib/server-data.ts` (riga 1727)**: oggi la funzione concentra molte query Supabase (Kanban, Task, Category, user_sites, KanbanColumn, historical tasks, lookup Client/SellProduct). Estrarre in funzioni dedicate (`fetchDashboardKanbans`, `fetchDashboardTasks`, `fetchDashboardLookups`) con tipi di ritorno chiari e `Promise.all` coordinato. Obiettivi: testabilità unitaria, profilazione latenze, riuso.
- **Hardening `verify:online` (script esistente)**: `package.json` già espone `"verify:online": "tsx scripts/verify-online.ts"` (verificato). Aggiungere: check commit `origin/main` vs commit deployato su Vercel (header `x-vercel-id`), ping rotte `/api/healthcheck` e `/api/cron/auto-archive` (solo HEAD/OPTIONS), output JSON machine-readable per CI.
- **Audit dashboard utente (beta)**: portare la sezione in `app/(administration)/administration/users/[id]/page.tsx` da placeholder a query reali, collegando `fetchCollaborators` + KPI Timetracking/Kanban per user.
- **Script one-shot DB parity**: tsx che fa `supabase db diff` equivalente tra schema locale e remoto (env `SUPABASE_PROD_URL`), utile dopo eventi come quello di `attendance_entries_status_check`.

### Alta
- **Pipeline release guidata**: estendere `docs/RELEASE-CHECKLIST-FDM.md` con flusso `npm run release:guided` che esegue in sequenza: `git fetch && git status`, test target (`kanban-categor`, `site`, `calendar`), `npm run verify:online` post-push, reminder migrazione Supabase, generazione note release automatiche dal `git log` dal tag precedente.
- **Rotazione PAT GitHub + playbook**: la coppia `.cursor/rules/no-secrets.mdc` + `docs/SECURITY-PLAYBOOK.md` esiste (verificato). Alta priorità: (a) completare il playbook con matrice ruoli Vercel/Supabase/GitHub, (b) formalizzare cadenza di rotazione (ogni 90 giorni) e (c) aggiungere pre-commit hook `rg "ghp_|github_pat_|sk_live_|sk_test_"` per bloccare accidentali commit di segreti (speculare alle regex CI in `.github/workflows/ci.yml`).
- **Template issue/PR con "impact area"** (vedi Quick win) da elevare a **obbligatorio** via branch protection rule su `main`.
- **Observability Dashboard & Assistant**: sfruttare i `console.error/warn` già introdotti in `fetchDashboardData` inviandoli a un logger centralizzato (Sentry/Axiom) per intercettare dataset vuoti lato produzione (oggi visibili solo su stdout Vercel).

---

## 3 azioni immediate (< 2 ore)

1. **Allineare main con `origin/main`**: decidere se il commit locale ahead deve essere pushato (dopo review) e ripulire le modifiche non committate su `app/api/debug/*`, `lib/cache-utils.ts`, `app/providers.tsx`, `package.json`, `app/api/kanban/tasks/move/route.ts`, `app/api/cron/auto-archive/route.ts` — molte sembrano legate al nuovo `lib/api/debug-guard.ts` (untracked) e richiedono un commit organico "debug endpoints guarded". Poi `git push` manuale.
2. **Creare `scripts/kill-ports.sh` + `"dev:reset"`**: aggiungere script e voce in `package.json` (`"dev:reset": "bash scripts/kill-ports.sh && rm -rf .next && next dev"`), poi aggiornare `docs/DEV-TROUBLESHOOTING.md §1` per rimandare al nuovo comando. Chiude la chat "process termination on ports 300x" portandola da PARZIALE a OK.
3. **Creare `.github/PULL_REQUEST_TEMPLATE.md` e `.github/ISSUE_TEMPLATE/bug.yml`** con sezione obbligatoria "Impact area (UI / API / DB / Deploy / Docs)" e checklist "Migrazione Supabase applicata? / `npm run verify:online` OK? / Note in `docs/RELEASE-CHECKLIST-FDM.md`?". Impatto immediato sulla tracciabilità delle release.

---

## Rischi sicurezza e operativi

- **Branch ahead 1 + molti file modificati**: finestra di divergenza locale/remoto. Rischio: perdita modifiche se il repo viene clonato pulito altrove, o push accidentale che supera review. Mitigazione: commit atomico + PR dedicata prima di qualsiasi `git push`.
- **Migrazione Supabase untracked `20260418090000_add_ipg_to_attendance_checks.sql`**: se applicata in locale ma non versionata, gli altri ambienti divergono → rischio uguale al caso storico `attendance_entries_status_check`. Mitigazione: `git add` della migrazione e PR con label `db-migration`.
- **Debug API routes modificate (`app/api/debug/*/route.ts`) + nuovo `lib/api/debug-guard.ts`**: probabile hardening. Finché non committato, un deploy rigenerato da `origin/main` esporrebbe endpoint non protetti. Alta priorità committare o revertire.
- **Assistente virtuale**: `GlobalSupportAssistant` apre la chat via evento `open-support-assistant` (oltre al click). Se qualche modulo dispatch-a l'evento su navigazione, può sembrare "chat che si riapre da sola". Da monitorare con log Sentry/Axiom.
- **Dev server in background (terminale 1)**: lanciare in parallelo `npm run build` corrompe cache `.next`. Regola operativa: eseguire build solo dopo aver terminato il dev server; considerare porta dedicata per build di verifica.
- **Parità DB locale/produzione**: l'audit (`AUDIT-ARCH-DATA-*.md`) identifica aree fragili; senza `npm run verify:online` integrato in CI post-deploy, errori di constraint/RLS emergono solo lato utente.

---

## Allegati

**Segreti / token**: nessun segreto individuato nei path standard. Tutte le occorrenze di `ghp_`, `github_pat_`, `sk_live_`, `sk_test_`, `service_role` sono:
- pattern di scan in `.github/workflows/ci.yml` (righe 60–63);
- testo della regola `.cursor/rules/no-secrets.mdc` (righe 11, 32);
- documentazione operativa (`docs/SECURITY-PLAYBOOK.md`, `docs/VERCEL_DEPLOYMENT.md`, `docs/VERCEL_ENVIRONMENT_SETUP.md`);
- teaser già redatti negli export (`docs/chat-exports/SECURITY-SCAN-2026-04-17.md`, `docs/chat-exports/README.md`, `docs/chat-exports/fdm_batch_4_admin_site_deploy.md`, `docs/agents-reports/INGEST-CURSOR-EXP-2026-04-17.md`, `docs/agents-reports/STREAM-6-dx-testing.md`, `docs/agents-reports/fdm_final_plan.md`);
- riferimenti `service_role` in policy RLS dentro `supabase/migrations/*.sql` (uso legittimo del ruolo, non chiavi).

**Percorsi chiave verificati durante la sessione**:
- `/Users/matteopaolocci/santini-manager/app/(administration)/administration/sites/[id]/edit/EditSiteForm.tsx`
- `/Users/matteopaolocci/santini-manager/app/(administration)/administration/sites/[id]/edit/page.tsx`
- `/Users/matteopaolocci/santini-manager/app/(administration)/administration/users/[id]/page.tsx`
- `/Users/matteopaolocci/santini-manager/components/site-settings/{ProductSettingsModal,FactorySettingsModal,HrSettingsModal,SiteSupportAndSubscriptionModal,SiteThemeSettingsModal,SettingsOverviewCards,SiteThemeColorsConfigurator,SettingsHelpButton}.tsx`
- `/Users/matteopaolocci/santini-manager/components/assistance/GlobalSupportAssistant.tsx`
- `/Users/matteopaolocci/santini-manager/components/calendar/{WeeklyCalendarView,CalendarProjectCard,MonthlyCalendarView,calendarComponent,CalendarTimeView,CalendarSummaryBar,ProjectOrSiteDetailDrawer}.tsx`
- `/Users/matteopaolocci/santini-manager/lib/server-data.ts` (`fetchDashboardData` riga 1727, `fetchCollaborators` riga 4974)
- `/Users/matteopaolocci/santini-manager/lib/site-settings-guides.ts`
- `/Users/matteopaolocci/santini-manager/scripts/verify-online.ts` e `package.json` → script `verify:online` già presente
- `/Users/matteopaolocci/santini-manager/supabase/migrations/20260305100000_fix_attendance_status_check.sql`
- `/Users/matteopaolocci/santini-manager/supabase/migrations/20260404123000_extend_sellproduct_categories_for_settings.sql`
- `/Users/matteopaolocci/santini-manager/supabase/migrations/20260418090000_add_ipg_to_attendance_checks.sql` (untracked)
- `/Users/matteopaolocci/santini-manager/docs/AUDIT-ARCH-DATA-{CHECKLISTS,FINDINGS-BACKLOG,OPTIMIZATION-ROADMAP}.md`
- `/Users/matteopaolocci/santini-manager/docs/DEV-TROUBLESHOOTING.md`
- `/Users/matteopaolocci/santini-manager/docs/SECURITY-PLAYBOOK.md`
- `/Users/matteopaolocci/santini-manager/docs/RELEASE-CHECKLIST-FDM.md`
- `/Users/matteopaolocci/santini-manager/.cursor/rules/no-secrets.mdc`
- `/Users/matteopaolocci/santini-manager/.github/workflows/ci.yml`
