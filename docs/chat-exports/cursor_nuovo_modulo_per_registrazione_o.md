# Nuovo modulo per registrazione ore
_Exported on 17/04/2026 at 1:30:51 CEST from Cursor (3.1.15)_

---

**User**

dobbiamo aggiungere un nuovo modulo (attivabile dalla sezione moduli), questo modulo permette di registare e visionare le ore dei dipendenti e degli admin con una tabella a quadratini dove a colpo d occhio si vede i giorni occuppati ferie ecc.. proponimi un piano

---

**Cursor**

Let me explore the codebase to understand the current architecture, how modules work, and the existing patterns.

Let me look more closely at the existing timetracking and employee/collaborator structure to understand what's already available.

Ho esplorato a fondo il codebase. Prima di proporti un piano dettagliato, ho bisogno di chiarire alcuni aspetti importanti.

**Dettagli modulo Presenze/Ore**

> **Quali tipi di stato giornata vuoi tracciare nella griglia?**
> - Base: Presente, Ferie, Assente
> - Medio: Presente, Ferie, Malattia, Permesso, Assente
> - Completo: Presente, Ferie, Malattia, Permesso, Straordinario, Smart Working, Assente ingiustificato ✔
> - Altro (specifica nel prossimo messaggio)

> **Questo modulo deve usare i dati delle ore già registrate nel modulo 'Ore' (timetracking) esistente, oppure è un sistema di presenze separato?**
> - Collegato al timetracking esistente - se ci sono ore registrate il giorno risulta 'presente'
> - Sistema separato - admin inserisce manualmente lo stato di ogni giorno
> - Ibrido - auto-rileva dal timetracking ma permette di aggiungere ferie/malattia manualmente ✔

> **Quale vista principale per la griglia a quadratini?**
> - Vista mensile (un mese alla volta, righe = dipendenti, colonne = giorni)
> - Vista annuale (tipo GitHub contributions, tutti i mesi)
> - Entrambe le viste con possibilità di switch ✔

---

**User**

inoltre nel modulo timetracking create, permetti di richiedere ferie dai dipendenti da li, e questa opzione si vede solo se il modulo e attivo.

---

**Cursor**

Perfetto, aggiungo questa funzionalità al piano. Lasciami verificare come viene controllata l'attivazione dei moduli nei componenti esistenti.

Ora ho tutti gli elementi necessari per proporre un piano completo. Ecco la proposta:

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the full plan step by step. Let me start with the database migration.

Let me check a few more files for the API pattern and permissions structure.

Now let me check a couple more files to understand the date picker and utility patterns.

Good, I now have all the context needed. Let me start implementing. I'll begin with the migration, then module config, then APIs, then UI components.

Now let me register the module and add the sidebar entry.

Now add the "Presenze" item to the sidebar menu. I'll add it after "Ore" in the sidebar items.

Now I need to make sure the "Presenze" item is included in the sidebar grouping. Let me check the grouping logic:

Now add `attendance` to the return object of `groupedMenuItems`:

Now add the "Presenze" section rendering in the sidebar, after "Calendari":

Now let me create the API routes. First the attendance route, then the leave-requests routes.

Now create the leave-requests API routes:

Now let me create the attendance UI components. I'll create the components directory and all the components.

Let me check what Tooltip component exists in the UI:

Good. Now I'll create all the attendance components. Let me start with the shared types and constants, then the grid components.

Now let me create the leave requests panel component:

Now the main AttendanceGrid component that ties everything together:

Now let me create the attendance page. Let me check the pattern used by other pages:

Now let's create the LeaveRequestForm component that will be used in the timetracking create page:

Now I need to integrate the LeaveRequestForm into the timetracking create page. I need to:
1. Add `isAttendanceModuleEnabled` prop to `CreatePage`
2. Pass it from the server page
3. Show a third tab when the module is enabled

Now add the `isAttendanceModuleEnabled` prop:

Now update the TabsList to add the "Richiedi Ferie" tab when the attendance module is enabled:

Now add the TabsContent for the leave request tab. Let me find the right place to add it:

Now update the server page to pass the `isAttendanceModuleEnabled` prop:

Now I need to add the attendance module check and pass it as prop. Let me find where the `CreatePage` component is rendered:

Now update the CreatePage rendering to pass the new prop:

Let me verify the `createServiceClient` is exported from the right location:

Good. Now let me also check the `createClient` import used in the create page - it imports from `@/utils/server`, let me verify that's the same thing:

Good - `createServiceClient` is a different export (from `utils/supabase/server.ts`). Let me check:

Good. The import path `@/utils/supabase/server` is correct. But actually, looking at the create page, it already uses `createClient` from `@/utils/server` which is an async function that uses cookies. Let me simplify by just using the same `createClient` that's already imported:

The admin panel for approving/rejecting leave requests is already implemented in two places:

1. **`LeaveRequestsPanel.tsx`** - shown in the attendance page (`AttendanceGrid.tsx`) with approve/reject buttons for admins
2. **Leave request PATCH API** - already auto-creates `attendance_entries` when a request is approved (in `app/api/sites/[domain]/leave-requests/[id]/route.ts`)

This todo is effectively done. Let me now check all files for linter errors.

No linter errors. Let me also verify the build doesn't have any TypeScript issues by running a quick type check:

Two TS errors with `Set` spread. Let me fix them by using `Array.from` instead:

Zero TypeScript errors. Let me mark the final todo as complete.

Tutti i task sono completati. Ecco un riepilogo di tutto quello che e stato implementato:

---

## Riepilogo implementazione

### Database
- **`supabase/migrations/20260305000000_add_attendance_module.sql`** - Crea le tabelle `attendance_entries` e `leave_requests` con indici, constraint di unicita e policy RLS

### Modulo e Sidebar
- **`lib/module-config.ts`** - Aggiunto modulo "attendance" (Presenze, categoria `management`, disabilitato di default)
- **`components/app-sidebar.tsx`** - Aggiunta voce "Presenze" nella sidebar con icona `faCalendarCheck`, visibile solo se il modulo e attivo

### API Routes (4 endpoint)
- **`GET /api/sites/[domain]/attendance`** - Ritorna dati presenze con logica ibrida (auto-detect da timetracking + entry manuali)
- **`POST /api/sites/[domain]/attendance`** - Admin inserisce/modifica stato giornata per un utente
- **`GET /api/sites/[domain]/leave-requests`** - Lista richieste ferie (admin vede tutte, utente solo le proprie)
- **`POST /api/sites/[domain]/leave-requests`** - Crea nuova richiesta ferie/permesso/malattia
- **`PATCH /api/sites/[domain]/leave-requests/[id]`** - Admin approva/rifiuta, con auto-creazione entry presenze se approvata

### Componenti UI (7 nuovi)
- **`AttendanceGrid.tsx`** - Componente principale con toolbar, selettore mese/anno, toggle mensile/annuale
- **`AttendanceMonthlyView.tsx`** - Vista mensile: righe = dipendenti, colonne = giorni con quadratini colorati
- **`AttendanceAnnualView.tsx`** - Vista annuale: tutti i 12 mesi con quadratini piccoli per dipendente
- **`AttendanceDayCell.tsx`** - Singola cella con tooltip e popover admin per cambiare stato
- **`AttendanceStats.tsx`** - Conteggi per tipo di stato (presenze, ferie, malattia, ecc.)
- **`AttendanceLegend.tsx`** - Legenda colori degli stati
- **`LeaveRequestsPanel.tsx`** - Pannello richieste con approvazione/rifiuto per admin
- **`LeaveRequestForm.tsx`** - Form per richiedere ferie, usato anche nel timetracking

### Pagina Presenze
- **`app/sites/[domain]/attendance/page.tsx`** - Pagina server con header e griglia presenze

### Integrazione Timetracking
- **`components/timeTracking/create-page.tsx`** - Aggiunto tab "Ferie" (terzo tab) visibile solo se modulo attendance attivo
- **`app/sites/[domain]/timetracking/create/page.tsx`** - Check server-side del modulo e passaggio prop `isAttendanceModuleEnabled`

---

**User**

ok cambia ferie in vacanze, aggiungi infortunio, togli permesso, togli straordinario, aggiungi formazione

---

**Cursor**

I'll update all files to reflect the new statuses. Let me trace through every file that references these statuses.

Let me update all files in parallel. The changes needed:

**Old statuses:** `presente, ferie, malattia, permesso, straordinario, smart_working, assente_ingiustificato`
**New statuses:** `presente, vacanze, malattia, infortunio, smart_working, formazione, assente_ingiustificato`

**Old leave types:** `ferie, permesso, malattia`
**New leave types:** `vacanze, malattia, infortunio`

Now I'll update all 5 files in parallel:

Now update the migration SQL:

Now update the attendance API route (valid statuses):

Now update the leave-requests API route (valid types):

Now let me verify everything compiles correctly:

Zero errors. Let me also update the tab label in the timetracking create page since "Ferie" should now say "Vacanze":

Also update the LeaveRequestForm description text:

Fatto. Ecco il riepilogo delle modifiche:

**File aggiornati (5):**

| File | Modifica |
|------|----------|
| `attendance-types.ts` | Type `AttendanceStatus`, `LeaveType`, `STATUS_CONFIG`, `LEAVE_TYPE_LABELS` |
| `migration SQL` | CHECK constraint su `attendance_entries.status` e `leave_requests.leave_type` |
| `attendance/route.ts` | Array `validStatuses` |
| `leave-requests/route.ts` | Array `validTypes` |
| `create-page.tsx` | Tab label "Ferie" -> "Assenze" |
| `LeaveRequestForm.tsx` | Descrizione aggiornata |

**Nuovi stati presenze:**
- Presente (verde), **Vacanze** (blu), Malattia (rosso), **Infortunio** (arancione), Smart Working (azzurro), **Formazione** (viola), Assente ingiustificato (grigio)

**Nuovi tipi richiesta assenza:** Vacanze, Malattia, Infortunio

---

**User**

Error: Failed to run sql query: ERROR: 42710: policy "Users can view attendance entries for their site" for table "attendance_entries" already exists

---

**Cursor**

The migration is failing because the tables/policies were already partially created from a previous run. I need to add `IF NOT EXISTS` guards or use `DROP POLICY IF EXISTS` before creating them. Let me fix the migration.

The tables were created in a previous run but the policies are now conflicting. I'll drop them first with `DROP POLICY IF EXISTS` before recreating.

Ora la migrazione fa `DROP POLICY IF EXISTS` prima di ogni `CREATE POLICY`, quindi e idempotente e non fallira se le policy esistono gia da un run precedente. Riprova a eseguirla.

---

**User**

il tipo in create aggiungi tutti i tipi

---

**Cursor**

L'utente vuole che nel form di richiesta assenze (nel timetracking create) si possano selezionare tutti i tipi di stato, non solo vacanze/malattia/infortunio. Aggiorno i tipi e la validazione.

Ora aggiorno la migrazione SQL e la validazione API per accettare tutti i tipi:

Verifico che tutto compili:

Fatto. Ora nel form di richiesta assenze (tab "Assenze" nel timetracking create) sono disponibili tutti i tipi:

- Vacanze
- Malattia
- Infortunio
- Smart Working
- Formazione
- Assente ingiustificato

Aggiornati: types, labels, migrazione SQL e validazione API.

---

**User**

non assenza inggiustificata ma assenza privata

---

**Cursor**

Ora aggiorno migrazione SQL e validazione API:

Fatto. Rinominato `assente_ingiustificato` in `assenza_privata` ovunque: types, labels, migrazione SQL e validazione API.

