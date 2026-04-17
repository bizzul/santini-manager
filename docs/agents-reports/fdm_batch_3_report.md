---

# Batch 3 Report - HR / Presenze / Timetracking (re-run 2026-04-17)

Output della ri-esecuzione del prompt `docs/chat-exports/fdm_batch_3_hr_timetracking.md`
sul repo `/Users/matteopaolocci/santini-manager` (HEAD corrente).
Rispetto alla versione precedente di questo file, i punti che erano
segnalati come MANCANTI sono stati verificati nuovamente; in particolare è
comparsa la migration IPG.

## Sintesi (tabella 5 righe)

| # | Chat | Stato | Nota principale |
|---|------|-------|-----------------|
| 1 | `cursor_modifiche_pagina_presenze.md` | OK | Enum stati completo, `ipg` sia in UI che in DB; `weekend` gestito. |
| 2 | `cursor_nuovo_modulo_per_registrazione_o.md` | OK | Modulo `attendance` in `module-config`, sidebar + tab ferie condizionati. |
| 3 | `cursor_inserimento_ore_e_tabelle_export.md` | OK | Riga rapida admin, bottoni check/X, export con colonne interne e pranzo. |
| 4 | `cursor_dettagli_progetto_nel_menu_repor.md` | PARZIALE | `getProjectLabel` attivo; resta **incoerenza label** `smart_working`: "Festivo" in griglia ma "Smart Working" in `LEAVE_TYPE_LABELS`. |
| 5 | `cursor_installation_date_timezone_issue.md` | PARZIALE | Hotfix `toDateString`+`formatInTimeZone` OK; `lib/tabular-report-export.ts` usa ancora `toLocaleDateString("it-IT")` su `Date` server-side. |

Typecheck (`npx tsc --noEmit`) **pulito**. Jest su pattern
`(timetracking|validation)` **2 suite / 5 test passati**. Build non rieseguita
(tsc + test verdi e non richiesto dal prompt se non rapido).

---

## Dettaglio per chat

### 1. `cursor_modifiche_pagina_presenze.md` — OK

- **GET** presenze unisce `user_sites` + `user_organizations` (stesso
  `organization_id`) e filtra profili `enabled`, escludendo `superadmin`;
  include admin org via condizione `directSiteUserSet || (organizationUserSet && role==="admin")` oltre a chi compare già in presenze/timetracking.
  — `app/api/sites/[domain]/attendance/route.ts:117-180`.
- **Enum stati** in `STATUS_CONFIG`: `presente`, `vacanze`, `malattia`,
  `infortunio`, `smart_working` (label UI "Festivo"), `formazione`,
  `assenza_privata` (giallo), `ipg`, `weekend`.
  — `components/attendance/attendance-types.ts:50-108`.
- **`ipg`** validato nel **POST** presenze (`route.ts:292-295`) e nel **POST**
  leave-requests (`app/api/sites/[domain]/leave-requests/route.ts:116-124`).
- **Domenica** gestita come weekend (colore grigio) con tooltip "Festivo"
  — `components/attendance/AttendanceDayCell.tsx:58-107`.
- **Vista default mensile** — `components/attendance/AttendanceGrid.tsx:64` (`useState(..., "monthly")`).
- **Migration DB per IPG** ora **presente**:
  `supabase/migrations/20260418090000_add_ipg_to_attendance_checks.sql`
  (CHECK su `attendance_entries.status` e `leave_requests.leave_type` include `ipg`).
  ⇒ Gap segnalato nella precedente iterazione di questo report **chiuso**.

### 2. `cursor_nuovo_modulo_per_registrazione_o.md` — OK

- Modulo `attendance` definito in `lib/module-config.ts:221-228`.
- Sidebar: voci con `moduleName` filtrate tramite `enabledModules.includes(moduleName)`
  — `components/app-sidebar.tsx:284-289, 511-515`.
- Tab **Assenze** in timetracking mostrata solo se
  `!isProjectLocked && isAttendanceModuleEnabled` — `components/timeTracking/create-page.tsx:736-740`.
- Rinomina stati (vacanze/infortunio/formazione/assenza privata/ipg/smart_working)
  allineati in `attendance-types.ts` e validazioni API.

### 3. `cursor_inserimento_ore_e_tabelle_export.md` — OK

- Riga rapida admin con `activityType` (project/internal), selezione attività
  interna e campi pranzo (`lunchOffsite`, `lunchLocation`) —
  `app/sites/[domain]/timetracking/table.tsx:354-488+`.
- Bottoni check verde / X rossa —
  `app/sites/[domain]/timetracking/columns.tsx:152-155`
  (`saveActionButtonClassName`=emerald, `cancelActionButtonClassName`=red).
- Export ore: `filterTimetrackings` non esclude più le entry interne per tipo e
  le colonne export includono **Attività Interna**, **Pranzo Fuori Sede**,
  **Luogo Pranzo** — `app/api/reports/time/route.ts:109-161, 303-335, 456-482`.
- Regex orario `^\d{1,2}:\d{2}(:\d{2})?$` in `validation/task/create.ts:47-56`
  ⇒ accetta sia `HH:mm` che `HH:mm:ss`: nessun conflitto con i nuovi input.

### 4. `cursor_dettagli_progetto_nel_menu_repor.md` — PARZIALE

- Helper `getProjectLabel` presente e formatta "codice - cliente - oggetto"
  — `lib/project-label.ts:49-54` (usa `" - "`, non il trattino tipografico "–";
  funzionale, ma piccola discrepanza con quanto descritto nella chat).
- Uso verificato in: `app/sites/[domain]/timetracking/createForm.tsx`,
  `editForm.tsx`, `columns.tsx`, `table.tsx`, `components/timeTracking/create-page.tsx`.
- **Incoerenza rimasta**: in `STATUS_CONFIG` la chiave `smart_working` ha
  label `"Festivo"` (griglia presenze), ma `LEAVE_TYPE_LABELS.smart_working`
  continua a valere `"Smart Working"` — `components/attendance/attendance-types.ts:78-118`.
  Effetto: nelle liste di richieste ferie appare "Smart Working" mentre nella
  griglia è "Festivo". Va deciso se allineare a "Festivo" o, meglio, rinominare
  il tipo a livello dominio (DB + enum) con una migration dedicata.

### 5. `cursor_installation_date_timezone_issue.md` — PARZIALE

- **Hotfix OK**: `lib/utils.ts:9` definisce
  `APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Europe/Zurich"`
  e `toDateString` (righe 52-68) usa `formatInTimeZone(value, APP_TIMEZONE, "yyyy-MM-dd")`
  per `Date`/stringhe.
- **Weekend disabilitati** (`isWeekend`) in `createForm.tsx`, `editForm.tsx`
  e `app/sites/[domain]/projects/columns.tsx:707`.
- **Punto non risolto**: `lib/tabular-report-export.ts:51-54` continua a
  serializzare le celle `Date` con `value.toLocaleDateString("it-IT")`
  senza `APP_TIMEZONE`. In SSR (Vercel) questo usa il fuso del container,
  non `Europe/Zurich`: rischio "giorno sbagliato" simile al bug originale
  su export PDF/Excel tabellari.

---

## Smoke check statici

### TypeScript
- `npx tsc --noEmit` → **exit 0** (nessun errore).

### Jest (pattern richiesto)
- `npx jest --testPathPattern='(timetracking|validation)'`
  → `Test Suites: 2 passed, 2 total — Tests: 5 passed, 5 total`.
  Il prompt suggeriva anche `attendance` ma non esistono suite dedicate in
  `__tests__/attendance/*` (cartella assente), quindi il pattern è stato
  ristretto alle aree coperte: timetracking (`timetracking-instructions.test.ts`)
  e validation (`task-create-validation.test.ts`).

### `rg "new Date("` su API attendance / timetracking / reports

File con `new Date()` da tenere d'occhio in ottica timezone
(`rg -n "new Date\\(" app/api/sites/[domain]/attendance app/api/reports/time app/api/reports/tasks`):

- `app/api/sites/[domain]/attendance/route.ts` — usa `new Date()` per calcolare
  range mese/anno (non critico, viene poi formattato con `toDateString` o
  confrontato lato DB con stringhe `YYYY-MM-DD`).
- `app/api/reports/time/route.ts` — `new Date()` in più punti:
  - righe 53/55 calcolano `startOfLocalDay` sul range mese → OK.
  - **riga 166**: `const dateKey = new Date(entry.date).toDateString()` — la
    chiave giornaliera dipende dal fuso del processo; se `entry.date` è
    serializzato come `YYYY-MM-DD` può produrre chiave off-by-one su Vercel.
  - righe 175-212: derivazione settimana/giorno da `Date` locale.
  - riga 243/303: sort per timestamp — OK.
- `app/api/reports/tasks/route.ts` — non in lista.

### `rg "toLocaleDateString"` (campione)
Punti in cui una `Date` server-side viene formattata senza passare da
`APP_TIMEZONE`: `lib/tabular-report-export.ts:53`, `lib/pdf-report-branding.ts:23`,
`components/timeTracking/my-hours-list.tsx`, `app/sites/[domain]/projects/columns.tsx`,
`createForm.tsx`, `editForm.tsx`, `components/table/editable-date-cell.tsx` e altri.
Lato client è in genere innocuo; lato server (Node) può produrre fusi
inattesi.

### Validazione regex orari
- `validation/task/create.ts:47-56` — regex `^\d{1,2}:\d{2}(:\d{2})?$`
  ⇒ compatibile sia con input `HH:mm` sia con `HH:mm:ss`: **nessun conflitto**
  con i nuovi campi.

### Build
Non rieseguita. Indicatori proxy ok (tsc clean, test targeted verdi).
Il dev server `next dev` è attivo (terminale 1) senza errori bloccanti.

---

## Piano miglioria

### Quick win (≤ 2h cad.)

1. **Helper unico `toIsoDateOnly`** in `lib/utils.ts` che incapsuli
   `formatInTimeZone(value, APP_TIMEZONE, "yyyy-MM-dd")` e usarlo sia in
   `lib/tabular-report-export.ts` sia nei punti di serializzazione date
   lato server (`pdf-report-branding.ts`, eventuali API report). Test unitario
   che simuli `TZ=UTC` e `TZ=America/Los_Angeles` e verifichi la stessa
   stringa per un orario 00:30 locale a Zurigo.
2. **Allineare `LEAVE_TYPE_LABELS.smart_working`** a "Festivo" per coerenza
   con `STATUS_CONFIG` e legenda griglia, **oppure** introdurre un tipo
   `festivo` separato e deprecare `smart_working` in ferie (scelta di
   dominio; vedi Media).
3. **Docs**: creare `docs/DATE-HANDLING-FDM.md` con
   do/don't (non usare `new Date(string)` per estrarre il giorno,
   passare sempre da `toDateString`/`toIsoDateOnly`, mai `toLocaleDateString`
   server-side senza timezone).

### Media (1-2 giornate)

1. **Test API** con fixture per:
   - `POST /api/sites/:domain/attendance` con status `ipg` e `assenza_privata`.
   - `POST /api/sites/:domain/leave-requests` con `smart_working` / `ipg`.
   - `GET /api/reports/time` con mix progetto/interno + pranzo fuori sede →
     controllo colonne e totali.
2. **Normalizzazione `dateKey`** in `app/api/reports/time/route.ts:166`:
   sostituire `new Date(entry.date).toDateString()` con
   `formatInTimeZone(entry.date, APP_TIMEZONE, "yyyy-MM-dd")` per evitare
   off-by-one in SSR Vercel.
3. **Separare `smart_working` da "festivo"** a livello dominio: se la
   richiesta business è "giorno non lavorativo a livello azienda", aggiungere
   un nuovo enum `festivo` con migration dedicata e rimuovere il "doppio
   significato" attuale.

### Alta (progetto dedicato)

1. **Schema time-event vs time-window**: distinguere in modo netto presenze
   (intervalli con stato) e timetracking (eventi di ore-progetto). Oggi il
   confine è implicito; una formalizzazione (tipi condivisi + query
   aggregatrici) ridurrebbe le incoerenze negli export.
2. **Audit date-handling repo-wide**: elencare tutti i `new Date(`,
   `toLocaleDateString`, `.toDateString()` server-side e migrare a helper
   `lib/utils.ts`; adottare una ESLint rule custom che vieti
   `toLocaleDateString` in file `app/**` server / `lib/**`.

---

## 3 azioni immediate (< 2 ore)

1. **Fix `dateKey` SSR** in `app/api/reports/time/route.ts:166` usando
   `formatInTimeZone(entry.date, APP_TIMEZONE, "yyyy-MM-dd")` al posto di
   `new Date(entry.date).toDateString()`. Piccolo diff, rischio basso.
2. **Allineare `LEAVE_TYPE_LABELS.smart_working`** in
   `components/attendance/attendance-types.ts` a `"Festivo"` (o aggiungere
   un `festivo` distinto). Se si sceglie l'alias "Festivo", nessuna
   migration; se si introduce un nuovo enum, programmare migration separata.
3. **Fix `tabular-report-export.ts`**: sostituire `toLocaleDateString("it-IT")`
   con una formattazione basata su `formatInTimeZone`. Aggiungere un
   test unitario con `TZ=UTC` per congelare il comportamento atteso.

---

## Rischi aperti (timezone, migration)

- **Migration `20260418090000_add_ipg_to_attendance_checks.sql`**: **presente
  nel repo** ma, se il DB di produzione è stato aggiornato a mano in
  precedenza, il `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` resta
  idempotente. Verificare comunque che `types/supabase` e le validazioni
  Zod siano allineate al set finale di status.
- **Export SSR con `toLocaleDateString`**: su Vercel senza `TZ` forzato il
  container è UTC; qualsiasi `Date` con componente orario diverso da
  mezzogiorno può produrre il giorno precedente/successivo in export
  tabellari e PDF. È il rischio più alto ancora aperto.
- **`new Date(entry.date)` per dateKey**: con `entry.date` salvato come
  `YYYY-MM-DD`, JavaScript lo interpreta come UTC midnight; in fusi ovest
  di Greenwich diventa giorno prima. Rischio basso oggi (Vercel fra us-east
  e europa), ma latente.
- **Incoerenza label `smart_working`**: non è una regressione bloccante ma
  causa confusione utente (griglia dice "Festivo", lista richieste ferie
  dice "Smart Working"). Da risolvere nel giro di 1 sprint.
- **`getProjectLabel`**: separatore `" - "` (hyphen-spazio) al posto del
  trattino en-dash "–" descritto nella chat; puramente cosmetico, da
  confermare con il design.

---

File chiave citati (percorsi assoluti):
- `/Users/matteopaolocci/santini-manager/app/api/sites/[domain]/attendance/route.ts`
- `/Users/matteopaolocci/santini-manager/app/api/sites/[domain]/leave-requests/route.ts`
- `/Users/matteopaolocci/santini-manager/app/api/reports/time/route.ts`
- `/Users/matteopaolocci/santini-manager/components/attendance/attendance-types.ts`
- `/Users/matteopaolocci/santini-manager/components/attendance/AttendanceDayCell.tsx`
- `/Users/matteopaolocci/santini-manager/components/attendance/AttendanceGrid.tsx`
- `/Users/matteopaolocci/santini-manager/components/timeTracking/create-page.tsx`
- `/Users/matteopaolocci/santini-manager/components/app-sidebar.tsx`
- `/Users/matteopaolocci/santini-manager/app/sites/[domain]/timetracking/table.tsx`
- `/Users/matteopaolocci/santini-manager/app/sites/[domain]/timetracking/columns.tsx`
- `/Users/matteopaolocci/santini-manager/lib/utils.ts`
- `/Users/matteopaolocci/santini-manager/lib/project-label.ts`
- `/Users/matteopaolocci/santini-manager/lib/module-config.ts`
- `/Users/matteopaolocci/santini-manager/lib/tabular-report-export.ts`
- `/Users/matteopaolocci/santini-manager/validation/task/create.ts`
- `/Users/matteopaolocci/santini-manager/supabase/migrations/20260305000000_add_attendance_module.sql`
- `/Users/matteopaolocci/santini-manager/supabase/migrations/20260305100000_fix_attendance_status_check.sql`
- `/Users/matteopaolocci/santini-manager/supabase/migrations/20260418090000_add_ipg_to_attendance_checks.sql`
