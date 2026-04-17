# Batch 3 - HR / Presenze / Timetracking (prompt operativo)

Copia tutto il blocco sottostante in una chat nuova.

```text
Sei un agente di verifica e miglioria per il progetto FDM.

OBIETTIVO
Verificare se le modifiche discusse nelle chat "HR / Presenze / Timetracking"
sono effettivamente operative nel repository ~/santini-manager. Poi produrre
un piano di miglioria realistico. Nessun push remoto. Nessuna migration
applicata a produzione.

VINCOLI
- Tempo max sessione: 45 minuti.
- Budget max token: 200 USD (stop + check se superi ~70%).
- Autonomia: non chiedere conferme, usa la Unblock Policy se bloccato.
- Non fare git push.
- Niente modifiche a schema prod: tutte le migration restano locali al repo.

INPUT - chat da analizzare (in /Users/matteopaolocci/Desktop/cursor_exp):
1. cursor_modifiche_pagina_presenze.md
2. cursor_nuovo_modulo_per_registrazione_o.md
3. cursor_inserimento_ore_e_tabelle_export.md
4. cursor_dettagli_progetto_nel_menu_repor.md
5. cursor_installation_date_timezone_issue.md

REPO target: /Users/matteopaolocci/santini-manager
File chiave presumibili (verifica):
- components/attendance/** (AttendanceGrid e simili)
- app/api/sites/[domain]/attendance/**
- app/api/sites/[domain]/leave-requests/**
- app/sites/[domain]/attendance/page.tsx
- components/timeTracking/** (create-page, filterTasks*)
- app/sites/[domain]/timetracking/** (table, createForm, editForm)
- app/api/reports/time/route.ts
- app/api/reports/tasks/route.ts
- lib/project-label.ts
- lib/utils.ts (toDateString, parseLocalDate, APP_TIMEZONE)
- supabase/migrations/*attendance*
- supabase/migrations/*task*time*

FASE A - VERIFICA OPERATIVITA
Per ogni chat input:
1. Leggi la chat, estrai: richiesta, soluzione, file toccati.
2. Verifica nel repo:
   - Presenze: enum/stati gestiti, esclusione disabilitati, inclusione admin
     organizzazione, IPG handling, colori legenda (festivo).
   - Modulo Presenze/Ferie: sidebar mostra i link solo se modulo attivo,
     API `attendance` e `leave-requests` accettano il nuovo schema.
   - Inserimento ore admin: campi pranzo/attivita interna, export Excel con
     colonne coerenti.
   - Dettagli progetto in menu report: select ore mostra
     codice + cliente + oggetto (vedi `lib/project-label.ts`).
   - Timezone data posa: `toDateString()` e uso di `APP_TIMEZONE`
     (`Europe/Zurich`) in salvataggi/visualizzazioni.
3. Classifica stato per ciascuna chat: OK | PARZIALE | MANCANTE | REGRESSIONE.

FASE B - SMOKE CHECK STATICI
- `rg "new Date\("` in API attendance/timetracking per individuare rischi
  timezone.
- Verifica che `validation/task/create.ts` non abbia regex orari che
  confliggano con i nuovi input (es. `HH:mm` vs `HH:mm:ss`).
- Controllo tipi TS: `npx tsc --noEmit` (solo se rapido, altrimenti skip).
- `npm test -- --testPathPattern='(timetracking|attendance|task-create)'`.
- `npm run build` (tail 40 righe) per confermare che nulla rompa la build.

FASE C - PIANO MIGLIORIA
Per ogni elemento non OK proporre:
- Quick win: standardizzazione conversione date "date-only" con un helper
  `toIsoDateOnly` riusato ovunque; test su fuso orario estivo/invernale.
- Media: test API per `POST /attendance`, `POST /leave-requests`,
  `GET /api/reports/time` con fixture.
- Alta: separazione schema "time event" (ore lavoro) vs "time window"
  (presenze) se non gia chiaro.

Migliorie trasversali:
- Linee guida `docs/DATE-HANDLING-FDM.md` con do/don't sui tipi data.
- Aggiornamento `docs/FEATURE-FLAGS.md` se emergono nuove env necessarie.
- Smoke test e2e mock: simulare pagamento di una giornata con 4 entry
  per verificare totale ore export e visualizzazione tabella.

FORMATO OUTPUT
Scrivere tutto in un unico file:
Desktop/cursor_exp/fdm_batch_3_report.md

Struttura obbligatoria:
## Sintesi (tabella 5 righe)
## Dettaglio per chat
## Smoke check statici
## Piano miglioria
## 3 azioni immediate (< 2 ore)
## Rischi aperti (timezone, migration)

STOP CONDITIONS
- Build o test rotti: stop.
- Superamento budget: stop e chiedi conferma.

UNBLOCK POLICY
Se bloccato: leggi fdm_unblock_policy.md nella cartella, estrai 5 chat
casuali e riprendi dall'ipotesi a rischio minore.
```
