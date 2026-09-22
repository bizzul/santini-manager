# RLS Hardening — 41 tabelle esposte + `attendance_entries`

Progetto: FDM (`matris-manager`) · Supabase `jzxffusiwtrvjwmpjztu` · inventario del **22.09.2026**.

Questo documento è l'output dello **Step 0** del piano di messa in sicurezza: inventario
degli accessi applicativi, verifica in sola lettura dello stato del DB remoto e confronto
migration locali/remote. Nessuna migration è stata applicata al remoto.

Riferimenti: `docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md` (F-001, F-002).

---

## 1. Stato verificato sul DB remoto (sola lettura, 22.09.2026)

Query eseguite via MCP Supabase in sola lettura su `pg_class`, `pg_policies`, `pg_proc`,
`pg_index`, `pg_publication_tables`, `information_schema.columns`,
`supabase_migrations.schema_migrations`.

### 1.1 Confermato

- **41 tabelle in `public` con `relrowsecurity = false`**, esattamente quelle elencate nel piano.
  Nessuna ha `FORCE ROW LEVEL SECURITY`.
- `Client` ha già le 4 policy corrette (`client_*_site_access`, `to authenticated`,
  `site_id is not null and user_can_access_site(site_id)`), **inattive** perché la RLS è spenta.
- Le 5 tabelle `inventory_*` con `site_id` hanno 4 policy ciascuna con la condizione
  tautologica `us.site_id = us.site_id` (sempre vera) e ruolo `public`.
- `sites` ha la sola policy `superadmin_can_access_all_sites` con `auth.role() = 'superadmin'`,
  mai vera (`auth.role()` restituisce `anon`/`authenticated`).
- `inventory_units` ha `SELECT true` per il ruolo `public`.
- `user_sites`: 4 policy "proprie righe". `user_organizations`: 4 "proprie righe" + 1 superadmin `ALL`.
- `attendance_entries` ha la RLS **attiva** con policy sbagliate: `SELECT true` per `public`
  (leggibile anche senza login) e INSERT/UPDATE/DELETE per qualsiasi utente autenticato
  di qualsiasi spazio.
- `User.auth_id` (uuid) e `User."authId"` (text): **59 righe, 0 NULL su entrambe, 0 discordanze**.
  Le due colonne sono interscambiabili.
- Realtime (`supabase_realtime`) attivo su `public.Task` e `public.User` (più `pm_*`, `support_*`).
- `user_can_access_site()` e `user_is_site_admin()` esistono come `SECURITY DEFINER STABLE`
  con la semantica descritta nel piano. Non vengono toccate.

### 1.2 Scostamenti rispetto alle premesse del piano

Tre premesse del piano non corrispondono allo stato reale del DB. Vanno lette prima di applicare.

| # | Premessa del piano | Stato reale verificato | Conseguenza |
|---|---|---|---|
| S-1 | `is_superadmin()` va creata | **Esiste già**, sul remoto e in `supabase/migrations/20260709130000_manager_projects.sql`, definita con `u."authId" = auth.uid()::text`. È usata da 18 policy di `support_*`, `pm_*`, `manager_*`, tutte `to authenticated` | La migration dello Step 1 fa `create or replace`: ridefinisce una funzione esistente. Poiché `auth_id` e `authId` coincidono su tutte le 59 righe, il comportamento è **identico**. La `revoke … from public, anon` è sicura: nessuna policy `anon` la usa |
| S-2 | `TaskHistory("taskId")` non ha indice | **`idx_taskhistory_taskid` esiste**, valido, ready, 6 MB su 592 451 righe | Non serve creare l'indice `concurrently` prima dell'ondata B. Il file manuale è comunque fornito, idempotente, e non farà nulla |
| S-3 | Vanno creati gli indici `user_sites(user_id, site_id)` e `user_organizations(user_id, organization_id)` | **Esistono già** (`idx_user_sites_user_site` + unique `user_sites_user_id_site_id_key`; `idx_user_organizations_user_org` + unique) | Crearli con un nome nuovo produrrebbe indici duplicati. La migration usa un blocco `DO` che controlla `pg_index` e crea solo ciò che manca davvero |

Indici sulle FK dell'ondata B — verifica su `pg_index`, colonna in **prima posizione**:

| Colonna | Indice esistente | Da creare |
|---|---|---|
| `"TaskSupplier"("taskId")` | `TaskSupplier_taskId_supplierId_key` | no |
| `"PackingItem"("packingControlId")` | `idx_packingitem_packingcontrolid` | no |
| `"Qc_item"("qualityControlId")` | `idx_qc_item_qualitycontrolid` | no |
| `"File"("sellProductId")` | `File_sellProductId_idx` | no |
| `"TaskHistory"("taskId")` | `idx_taskhistory_taskid` | no |
| `"KanbanColumn"("kanbanId")` | — | **sì** |
| `"ClientAddress"("clientId")` | — | **sì** |
| `"File"("taskId")` | — | **sì** |
| `"File"("errortrackingId")` | — | **sì** |
| `"_RolesToTimetracking"("B")` | — | **sì** |
| `"_RolesToUser"("B")` | — | **sì** |

### 1.3 Migration presenti solo sul remoto

`supabase_migrations.schema_migrations` remoto: 43 versioni. `supabase/migrations/` locale: 40 file.

Solo sul remoto:

| Versione | Nome | Tabelle toccate |
|---|---|---|
| `20260910143422` | `crm_persone_estensione` | `persone` |
| `20260910143441` | `crm_attivita_estensione` | `attivita*` |
| `20260910143504` | `crm_notifiche_log` | `crm_notifiche_log` |

Tutte e tre toccano solo tabelle CRM che **hanno già la RLS attiva** e sono **fuori perimetro**.
Non sono state create né modificate. Nessuna migration è presente solo in locale.

Quattro file locali hanno un nome diverso dalla versione remota corrispondente
(`20260806065039/51/417/433_remote_campagna_baseline.sql` ↔ `campagna_2027_schema`,
`campagna_2027_site_modules`, `fabio_kappeli_site`, `fabio_kappeli_site_modules`):
stesse versioni, nessun disallineamento di schema.

**Tutte e 42 le tabelle in perimetro sono create dalla baseline locale**
`20260709120000_baseline.sql`, con le stesse policy errate presenti sul remoto. Lo stack locale
riproduce quindi fedelmente il perimetro di questo lavoro.

### 1.4 Dati rilevanti

| Tabella | Righe | Note |
|---|---|---|
| `Task` | 866 | 0 con `site_id` NULL |
| `TaskHistory` | 592 451 | 946 MB, 0 orfane |
| `Action` | 5 065 | **1 867 con `site_id` NULL** |
| `Errortracking` | 1 | **1 con `site_id` NULL** |
| `Roles` | 17 | **tutte con `site_id` NULL** (ruoli globali) |
| `File` | 297 | **4 senza nessuno dei tre padri** |
| `attendance_entries` | 923 | `site_id` NOT NULL |
| `Checklist_item` | 0 | nessuna FK |
| `ClientAddress`, `PackingItem`, `Qc_item`, `Department`, `Exit_checklist`, `PackingMasterItem`, `QcMasterItem`, `QualityControl`, `PackingControl`, `audit_logs` | 0 | tabelle vuote |
| `User` | 59 | 2 superadmin, 9 admin (1 non `enabled`), 48 user |

`Action.site_id` NULL, scomposizione per possibilità di backfill:

- 18 righe hanno `taskId` valorizzato e il `Task` ha `site_id` → **backfillabili dal `Task`**
- 34 righe hanno solo `clientId`
- **1 815 righe non hanno nessun padre** (né `taskId` né `clientId`); tutte hanno `user_id`,
  e 847 appartengono a un utente con **un solo** `user_sites`

Il backfill proposto dal piano (`Action.site_id` da `Task.site_id` via `taskId`) recupera quindi
**18 righe su 1 867**. Vedi §5.

---

## 2. Inventario accessi — riepilogo per tabella

Estratto automaticamente da `.from("<Tabella>")` su `app/`, `components/`, `lib/`, `hooks/`,
`modules/`, `services/`, `store/`, `utils/`, `validation/`, `config/`, `middleware.ts`, `proxy.ts`.
Il dettaglio file per file, con numeri di riga, è in
[`docs/rls-hardening/accessi-completi.md`](rls-hardening/accessi-completi.md).

Legenda client:

- **service** — `createServiceClient()`, bypassa la RLS, **non impattato**
- **server sessione** — `createClient()` da `utils/supabase/server`, **impattato**
- **browser** — `createClient()` da `utils/supabase/client`, **impattato**
- **misto** — il file usa più client; il singolo accesso va letto nel dettaglio

I conteggi escludono `scripts/` e `__tests__/` (fuori dal runtime dell'app).

| Tabella | Ondata | File a runtime | Client | Op. | Rischio di rottura |
|---|---|---|---|---|---|
| `Task` | A | 66 (55 impattati) | server sessione, service, misto | D I S U | **alto** — tocca percorsi non autenticati |
| `Client` | A | 26 (23 impattati) | server sessione, service, misto, browser | D I S U | medio — client di sessione |
| `Kanban` | A | 34 (33 impattati) | server sessione, service, misto | D I S U | **alto** — tocca percorsi non autenticati |
| `KanbanCategory` | A | 6 (6 impattati) | server sessione | D I S U | medio — client di sessione |
| `Timetracking` | A | 24 (18 impattati) | server sessione, service, misto | D I S U | medio — client di sessione |
| `Supplier` | A | 15 (5 impattati) | server sessione, service | D I S U | medio — client di sessione |
| `Product` | A | 3 (3 impattati) | server sessione | D S U | medio — client di sessione |
| `Product_category` | A | 2 (1 impattati) | service, server sessione | S | medio — client di sessione |
| `Department` | A | 0 (0 impattati) | — | — | nullo — nessun accesso a runtime |
| `Exit_checklist` | A | 0 (0 impattati) | — | — | nullo — nessun accesso a runtime |
| `PackingControl` | A | 8 (8 impattati) | server sessione, misto, service | D I S | medio — client di sessione |
| `PackingMasterItem` | A | 0 (0 impattati) | — | — | nullo — nessun accesso a runtime |
| `QcMasterItem` | A | 0 (0 impattati) | — | — | nullo — nessun accesso a runtime |
| `QualityControl` | A | 7 (7 impattati) | server sessione, misto, service | D I S | medio — client di sessione |
| `site_modules` | A | 8 (7 impattati) | server sessione, service | D I I+U S | medio — client di sessione |
| `inventory_categories` | A | 15 (5 impattati) | service, server sessione | D I S U | medio — client di sessione |
| `inventory_items` | A | 14 (10 impattati) | service, server sessione, misto | D I S U | medio — client di sessione |
| `inventory_item_variants` | A | 7 (6 impattati) | server sessione, misto, service | D I S U | medio — client di sessione |
| `inventory_suppliers` | A | 6 (3 impattati) | service, server sessione | I I+U S | medio — client di sessione |
| `inventory_warehouses` | A | 3 (2 impattati) | server sessione, service | I S | medio — client di sessione |
| `inventory_subcategory_images` | A | 4 (1 impattati) | service, server sessione | D I I+U S U | medio — client di sessione |
| `Action` | A | 59 (51 impattati) | server sessione, misto, service | D I S | medio — client di sessione |
| `Errortracking` | A | 13 (8 impattati) | server sessione, service, misto, browser | D I S U | medio — client di sessione |
| `KanbanColumn` | B | 25 (24 impattati) | server sessione, service, misto | D I S U | **alto** — tocca percorsi non autenticati |
| `TaskHistory` | B | 7 (6 impattati) | server sessione, service | D I S | medio — client di sessione |
| `TaskSupplier` | B | 11 (10 impattati) | server sessione, service | D I S U | medio — client di sessione |
| `ClientAddress` | B | 1 (1 impattati) | server sessione | D | medio — client di sessione |
| `File` | B | 14 (13 impattati) | server sessione, service, misto | D I S U | medio — client di sessione |
| `PackingItem` | B | 2 (2 impattati) | server sessione | D | medio — client di sessione |
| `Qc_item` | B | 2 (2 impattati) | server sessione | D | medio — client di sessione |
| `_RolesToTimetracking` | B | 6 (5 impattati) | server sessione, misto, service | D I | medio — client di sessione |
| `_RolesToUser` | B | 10 (7 impattati) | server sessione, service, misto | D I S | medio — client di sessione |
| `Checklist_item` | B | 0 (0 impattati) | — | — | nullo — nessun accesso a runtime |
| `User` | C | 52 (42 impattati) | service, server sessione, misto, browser | D I S U | **alto** — tocca percorsi non autenticati |
| `sites` | C | 34 (27 impattati) | server sessione, service, browser | D I S U | **alto** — tocca percorsi non autenticati |
| `organizations` | C | 11 (10 impattati) | service, server sessione, browser | D I S U | **alto** — tocca percorsi non autenticati |
| `user_sites` | C | 24 (19 impattati) | server sessione, service, browser, misto | D I I+U S U | **alto** — tocca percorsi non autenticati |
| `user_organizations` | C | 21 (18 impattati) | server sessione, service, browser, misto | D I I+U S | **alto** — tocca percorsi non autenticati |
| `audit_logs` | C | 0 (0 impattati) | — | — | nullo — nessun accesso a runtime |
| `Roles` | C | 13 (9 impattati) | server sessione, service, misto | D I I+U S U | medio — client di sessione |
| `inventory_units` | C | 3 (3 impattati) | server sessione | S | medio — client di sessione |
| `attendance_entries` | fix | 5 (3 impattati) | server sessione, service | D I I+U S | medio — client di sessione |
---

## 3. Percorsi non autenticati e service-role (F-001)

### 3.1 Risoluzione dominio → sito: **avviene con service role**

`lib/site-context.ts` → `lib/fetchers.ts::getSiteData()` legge `sites` con
**`createServiceClient()`**, dentro `unstable_cache`. `middleware.ts` delega a `proxy.ts`, che
chiama solo `utils/supabase/middleware.ts::updateSession()` — il quale fa esclusivamente
`auth.getUser()` / `auth.getSession()` e **non legge nessuna tabella**.

Conseguenza: **attivare la RLS su `sites` non rompe la risoluzione del dominio**, né prima né
dopo il login. La condizione di stop dello Step 5 non si verifica. L'ondata C può procedere.

Resta aperto come F-001: `getSiteData()` risolve qualunque sottodominio senza verificare che
il chiamante abbia accesso al sito. Non è un problema di RLS ma di autorizzazione applicativa.

### 3.2 Route di debug senza alcun controllo di accesso

Tre route usano il **service role senza nessun gate** (né sessione, né ruolo, né `NODE_ENV`):

| Route | Client | Cosa espone |
|---|---|---|
| `app/api/debug/database-tables/route.ts` | service | enumerazione tabelle del DB |
| `app/api/debug/site-lookup/route.ts` | service | lookup arbitrario su `sites` |
| `app/api/debug/vercel-env/route.ts` | service | informazioni di ambiente e connettività DB |

**Questa lavorazione non le tocca** (fuori perimetro: nessuna modifica applicativa oltre
lo Step 7). Restano esposte anche dopo la RLS, perché il service role la bypassa.
Sono materiale F-001 e vanno chiuse a parte.

Le altre route `app/api/debug/**` (`kanbans`, `basic`, `user-context`, `site-flow`,
`site-navigation`) usano il client di sessione: **dopo la RLS restituiranno 0 righe agli anonimi**,
che è un miglioramento, non una regressione.

### 3.3 Percorsi di onboarding e autenticazione

| Percorso | Client | Tabelle | Esito atteso dopo la RLS |
|---|---|---|---|
| `app/(auth)/auth/callback/route.ts` | server sessione | `User`, `user_organizations`, `user_sites` | **OK** — la sessione esiste già (code exchange fatto) e legge solo righe proprie. La lettura di `User` è `eq("authId", user.id)`: coperta dal ramo "sé stesso" |
| `components/home/invitation-handler.tsx` | browser | `User`, `user_organizations`, `user_sites` | **OK** — sola lettura di righe proprie, con sessione. Non scrive `user_sites` |
| `components/complete-signup.tsx` | browser | `organizations`, `sites`, `User` | **OK con una riserva**, vedi §4.1 |
| `app/(auth)/quick-login/data.ts` | service | `User`, `user_sites`, `user_organizations` | non impattato (bypassa la RLS). Resta F-001 |
| `app/launch/route.ts` | sessione + service | `User` | non impattato sul ramo service |
| `app/api/cron/auto-archive/route.ts` | server sessione | `Task` | protetto da `CRON_SECRET`; gira **senza sessione utente** → dopo la RLS leggerà **0 task**. Vedi §4.4 |

### 3.4 Uso del service role a runtime

78 file usano `createServiceClient()`. Non vengono modificati da questa lavorazione e non sono
impattati dalla RLS. Quelli che riguardano il perimetro e che restano da proteggere con
`withSiteAuth` (F-001) sono elencati nel dettaglio in
[`accessi-completi.md`](rls-hardening/accessi-completi.md) con client `service`.

Nota importante per l'ondata C: la **GET** di `app/api/sites/[domain]/attendance/route.ts` usa
il service role. La pagina Presenze continuerà quindi a leggere come oggi anche dopo aver
corretto le policy di `attendance_entries`.

---

## 4. Punti di rottura individuati e decisioni prese

### 4.1 `complete-signup.tsx` — lookup di `User` per email senza sessione

```
components/complete-signup.tsx:203  .from("User").select("authId").eq("email", userEmail).single()
```

È un **fallback**, raggiunto solo se `auth.getUser()` non restituisce un utente. Oggi funziona
perché la RLS è spenta — il che significa che **oggi chiunque, senza login, può leggere tutta la
tabella `User` per email**: è esattamente la vulnerabilità da chiudere.

Dopo la RLS quel fallback restituirà 0 righe e l'utente vedrà
"Profilo utente non trovato. Contatta l'amministratore."

Nel flusso normale l'utente arriva su `/auth/complete-signup` **dopo** `auth/callback`, che ha già
stabilito la sessione: `authId` è valorizzato e il fallback non viene percorso. Il rischio è
quindi limitato al caso in cui il link d'invito venga aperto in un contesto senza cookie di sessione.

**Non è stato modificato**: sistemarlo richiede una server action o una route con service role,
cosa che il vincolo "niente nuovo `createServiceClient()` senza `withSiteAuth`" non permette di
improvvisare in un flusso pre-login. È segnalato in §5 come decisione.

### 4.2 `user_organizations` e `User` — le dropdown collaboratori

`app/sites/[domain]/collaborators/actions.ts::getAvailableUsersForSite()` (client di sessione,
già protetta da `checkAdminAccess`) fa:

1. `user_sites` `.eq("site_id", siteId)` → coperto aggiungendo la SELECT `user_can_access_site(site_id)`
2. `user_organizations` `.eq("organization_id", organizationId)` → con la sola policy "proprie righe"
   **restituirebbe solo la riga dell'admin stesso**
3. `User` `.in("authId", orgUserIds)` su utenti **dell'organizzazione ma non ancora del sito** →
   il ramo "condivide un sito con me" previsto dal piano **non li coprirebbe**

Serve quindi, per non rompere l'aggiunta di collaboratori, un ramo di visibilità
**a livello di organizzazione**. Una policy su `user_organizations` che interroga
`user_organizations` andrebbe in ricorsione infinita, perciò sono introdotti due helper
`SECURITY DEFINER` nuovi (non modificano la semantica di quelli esistenti):

- `public.user_in_organization(target_org_id uuid)`
- `public.user_shares_tenancy_with(target_auth_id uuid)` — stessa organizzazione **o** stesso sito

`lib/auth-utils.ts::getUsersInOrganizations()` fa la stessa cosa ma è **codice morto**
(nessun chiamante nel repo).

### 4.3 `Action` — insert senza `site_id`

Gli insert su `Action` valorizzano `site_id` solo se il contesto sito è disponibile
(`if (siteId) actionData.site_id = siteId`). Con la policy di ondata A un insert senza `site_id`
verrà **rifiutato**.

Impatto reale: nel codice l'esito di questi insert **non è mai bloccante** — o non viene
controllato (`app/sites/[domain]/kanban/actions/create-item.action.ts:153`) o viene solo loggato
(`app/api/kanban/tasks/move/route.ts:785`). L'azione utente non si rompe: si perde la riga di
storico. Frequenza attuale: **5 righe su 173 a settembre 2026** (era 568/993 a gennaio).

Nessuna modifica applicativa: il comportamento corretto è che quelle righe smettano di essere
create senza tenant.

### 4.4 `app/api/cron/auto-archive/route.ts` — cron senza sessione

Usa `createClient()` (sessione) ma gira da Vercel Cron con solo `CRON_SECRET`: **non c'è utente**.
Dopo l'ondata A leggerà 0 `Task` e l'auto-archiviazione smetterà silenziosamente di funzionare.

Non è stato modificato in questa lavorazione: passare a `createServiceClient()` è consentito dal
piano solo con `withSiteAuth`, che non è applicabile a un cron. È segnalato in §5 come decisione
e va risolto **prima o contestualmente all'ondata A**.

### 4.5 `save-kanban-state.action.ts` — filtro su una colonna inesistente

`TaskHistory` ha solo `(id, "taskId", snapshot, "createdAt")`: **nessun `site_id`**.
La funzione filtra e inserisce `site_id` su `TaskHistory` quando `siteId` è valorizzato.
Oggi non esplode solo perché `KanbanBoard.tsx:1168` chiama `saveState()` **senza dominio**,
quindi `siteId` resta `null` e i rami vengono saltati.

Conseguenza: passare il `domain` come chiede lo Step 7 **introdurrebbe** un errore 42703.
La correzione applicata allo Step 7 è quindi doppia e minima (vedi §7 del report finale).

### 4.6 `attendance_entries` — chi cancella una presenza

`app/api/sites/[domain]/attendance/route.ts`: sia `POST` (upsert) sia `DELETE` sono già
gated in codice da `isAdminOrSuperadmin(userContext.role)` — `lib/permissions.ts:14`,
cioè `role === "admin" || role === "superadmin"`, gli stessi ruoli di `user_is_site_admin()`.
Il collaboratore **non cancella** la propria presenza.

**Decisione: DELETE con `user_is_site_admin(site_id)`.** Coerente con il gate applicativo esistente.

Unico scostamento: `user_is_site_admin()` richiede anche `u.enabled = true`. Sul DB c'è
**1 admin con `enabled = false`**, che comunque non supera il gate applicativo (`getUserContext()`
tratta gli utenti disabilitati come non autenticati, `lib/auth-utils.ts:186`).

### 4.7 `site_modules` — scritture solo superadmin

`app/api/sites/[domain]/modules/route.ts:147` rifiuta con 403 chi non è `superadmin`;
`app/(administration)/administration/sites/actions.ts:16` richiede `canAccessAllOrganizations`.
**Confermato**: SELECT con `user_can_access_site(site_id)`, scrittura con `is_superadmin()`.

### 4.8 Tabelle senza accessi nel codice

`Department`, `Exit_checklist`, `PackingMasterItem`, `QcMasterItem`, `Checklist_item`,
`audit_logs` non hanno **nessun** `.from()` nel repo. Sono tutte vuote o quasi.
Attivare la RLS su di esse ha rischio funzionale nullo.

`audit_logs` non ha colonna `site_id` e ha `user_id` di tipo **`text`**: la policy INSERT
dovrà confrontare con `(select auth.uid())::text`.

---

## 5. Decisioni che servono da Matteo

| # | Decisione | Contesto | Raccomandazione |
|---|---|---|---|
| D-1 | **Backfill `Action.site_id`** | 1 867 righe NULL; solo **18** derivabili da `Task.site_id` via `taskId`, 34 da `clientId`, 1 815 senza padre (di cui 847 con utente monosito) | Proposta in `supabase/manual/20260923_action_backfill_site_id_PROPOSTA.sql`, non eseguita. Il ritorno è basso: le 1 815 righe restano comunque visibili al solo superadmin. Si può anche non fare nulla |
| D-2 | **DELETE presenze** | risolta dal codice: già solo admin | `user_is_site_admin(site_id)` — applicata, vedi §4.6. Serve solo conferma |
| D-3 | **Risoluzione dominio → sito prima del login** | avviene con service role, non è bloccante | Nessuno stop. Resta F-001 da chiudere a parte |
| D-4 | **Migration solo sul remoto** | 3 migration CRM del 10.09.2026, tutte fuori perimetro | Vanno recuperate in `supabase/migrations/` con `supabase db pull`, come lavoro separato |
| D-5 | **Cron `auto-archive` senza sessione** (§4.4) | si romperà con l'ondata A | Va protetto con service role + `CRON_SECRET` come unico gate, o va dato al cron un utente di servizio. **Da decidere prima dell'ondata A** |
| D-6 | **Fallback `complete-signup` per email** (§4.1) | oggi è una lettura anonima di tutta la tabella `User` | Va sostituito con una server action che usi la sessione, oppure rimosso. Basso impatto nel flusso normale |

---

## 6. Criterio di verifica finale

Dopo tutte le migration, su DB locale:

```sql
select relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```

deve restituire **0 righe**.

E nessuna policy residua con `using (true)` per `public`/`anon` sulle tabelle toccate,
né condizioni `us.site_id = us.site_id`:

```sql
select tablename, policyname, cmd, roles::text, qual
from pg_policies
where schemaname = 'public'
  and (qual like '%us.site_id = us.site_id%'
       or (qual = 'true' and roles::text like '%public%'));
```
