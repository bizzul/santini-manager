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

---
---

# REPORT FINALE

Stato: **tutte le migration sono scritte e committate, nessuna e' stata applicata**.
Il DB remoto `jzxffusiwtrvjwmpjztu` e' stato interrogato solo in lettura.

## R1. Tabella riassuntiva

Le condizioni delle policy sono per esteso nelle migration, ognuna commentata.
In sintesi il criterio e':

- **ondata A** — `site_id is not null and user_can_access_site(site_id)` su tutte e quattro
  le operazioni (eccezioni: `Action`/`Errortracking` in SELECT, `site_modules` in scrittura)
- **ondata B** — `exists (… padre … and user_can_access_site(padre.site_id))`
- **ondata C** — criteri di identita' e tenancy, uno per tabella

Colonna "RLS attiva": stato risultante **dopo** l'applicazione di tutte le migration.

| Tabella | Ondata | Policy create | RLS attiva | Migration |
|---|---|---|---|---|
| `Task` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092000_rls_a_task_kanban |
| `Client` | A | policy preesistenti `client_*_site_access`, non duplicate | si' | — |
| `Kanban` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092000_rls_a_task_kanban |
| `KanbanCategory` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092000_rls_a_task_kanban |
| `Timetracking` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `Supplier` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092100_rls_a_anagrafiche |
| `Product` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092100_rls_a_anagrafiche |
| `Product_category` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092100_rls_a_anagrafiche |
| `Department` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092100_rls_a_anagrafiche |
| `Exit_checklist` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `PackingControl` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `PackingMasterItem` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `QcMasterItem` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `QualityControl` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `site_modules` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923093100_rls_a_site_modules |
| `inventory_categories` | A | policy create allo Step 2 · 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923091000_rls_fix_policy_errate |
| `inventory_items` | A | policy create allo Step 2 · 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923091000_rls_fix_policy_errate |
| `inventory_item_variants` | A | policy create allo Step 2 · 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923091000_rls_fix_policy_errate |
| `inventory_suppliers` | A | policy create allo Step 2 · 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923091000_rls_fix_policy_errate |
| `inventory_warehouses` | A | policy create allo Step 2 · 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923091000_rls_fix_policy_errate |
| `inventory_subcategory_images` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923093000_rls_a_inventory |
| `Action` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `Errortracking` | A | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923092200_rls_a_ore_errori_qualita |
| `KanbanColumn` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `TaskHistory` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094100_rls_b_taskhistory |
| `TaskSupplier` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `ClientAddress` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `File` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `PackingItem` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `Qc_item` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `_RolesToTimetracking` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `_RolesToUser` | B | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923094000_rls_b_figlie |
| `Checklist_item` | B | 1 (ALL) | si' | 20260923094000_rls_b_figlie |
| `User` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095000_rls_c_user |
| `sites` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095100_rls_c_sites_organizations |
| `organizations` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095100_rls_c_sites_organizations |
| `user_sites` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095200_rls_c_user_sites_organizations |
| `user_organizations` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095200_rls_c_user_sites_organizations |
| `audit_logs` | C | 2 (INSERT SELECT) | si' | 20260923095300_rls_c_audit_roles_units |
| `Roles` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095300_rls_c_audit_roles_units |
| `inventory_units` | C | 4 (DELETE INSERT SELECT UPDATE) | si' | 20260923095300_rls_c_audit_roles_units |
| `attendance_entries` | fix | RLS gia' attiva prima della lavorazione · 4 (DELETE INSERT SELECT UPDATE) | si' (gia' attiva) | 20260923091000_rls_fix_policy_errate |

Verifica strutturale eseguita sui file: **41 tabelle su 41 ricevono
`enable row level security`**, nessuna in piu' e nessuna in meno rispetto all'elenco
del piano. `attendance_entries` e' l'unica con policy ma senza `enable`, perche' la RLS
era gia' attiva.

### Esito test

| Cosa | Esito |
|---|---|
| `npm run typecheck` | **pulito** |
| `npm test` | **461 passati, 7 skip, 0 falliti** (73 suite) |
| `npm run build` | **ok** |
| `npm run lint` | nessun rilievo sui file toccati. Restano 2 errori `prefer-const` **preesistenti** in `app/api/fatturazione/tasks/[taskId]/supplementi/route.ts:146` e `app/api/support/kb/route.ts:50`, file fuori perimetro: non toccati |
| Sintassi SQL delle 12 migration + 12 rollback + 2 file manuali | **validata** con il parser di PostgreSQL (`libpg_query`) |
| `scripts/zztest-rls-isolation.ts` | **scritto e typecheckato, MAI ESEGUITO** — vedi R6 |

## R2. Ordine di applicazione manuale

Le migration sono numerate per essere applicate in ordine di nome file.
Ogni riga ha il suo rollback gemello in `supabase/rollback/`, stesso nome + `_rollback.sql`.

| # | Migration | Cosa verificare nell'app dopo | Rollback |
|---|---|---|---|
| 1 | `20260923090000_rls_helpers_indici.sql` | nulla cambia per l'utente. Controllare che `support_*` e `pm_*` continuino a funzionare per i superadmin (`is_superadmin()` viene ridefinita) | `..._rls_helpers_indici_rollback.sql` — **ripristina** `is_superadmin()`, non la droppa |
| 2 | `20260923091000_rls_fix_policy_errate.sql` | **Presenze**: lettura (usa il service role, non deve cambiare), inserimento e cancellazione da admin. Magazzino: ancora invariato, la RLS e' spenta | `..._rls_fix_policy_errate_rollback.sql` |
| — | `supabase/manual/20260923_taskhistory_taskid_idx.sql` | **no-op sul remoto**, l'indice esiste gia'. Eseguire solo il blocco 1 (verifica) | — |
| 3 | `20260923092000_rls_a_task_kanban.sql` | **Kanban**: apertura board, drag & drop fra colonne, realtime sui Task fra due browser. Calendari | `..._rls_a_task_kanban_rollback.sql` |
| 4 | `20260923092100_rls_a_anagrafiche.sql` | **Clienti** (lista, creazione, modifica), **Fornitori**, **Prodotti**, import CSV clienti e fornitori | `..._rls_a_anagrafiche_rollback.sql` |
| 5 | `20260923092200_rls_a_ore_errori_qualita.sql` | **Ore** (registrazione, modifica, report), **Errori**, **Qualita'**, **Imballaggio**, **Fatturazione** | `..._rls_a_ore_errori_qualita_rollback.sql` |
| 6 | `20260923093000_rls_a_inventory.sql` | **Magazzino**: categorie, articoli, varianti, fornitori, depositi, immagini sottocategoria | `..._rls_a_inventory_rollback.sql` |
| 7 | `20260923093100_rls_a_site_modules.sql` | menu e moduli visibili per ogni spazio; `/administration` → attivazione moduli da superadmin | `..._rls_a_site_modules_rollback.sql` |
| — | **24 h di osservazione** | log Supabase: cercare `42501` e `row-level security`. Prima di proseguire | — |
| 8 | `20260923094000_rls_b_figlie.sql` | colonne kanban, allegati (upload, collegamento a errore/progetto, cancellazione), indirizzi cliente, ruoli sulle ore | `..._rls_b_figlie_rollback.sql` |
| 9 | `20260923094100_rls_b_taskhistory.sql` | **snapshot kanban** e cronologia progetto. Misurare la `explain` in fondo alla migration | `..._rls_b_taskhistory_rollback.sql` |
| — | **24 h di osservazione** | idem | — |
| 10 | `20260923095000_rls_c_user.sql` | login, `/sites/select`, **dropdown collaboratori e assegnatari**, realtime su User, invito collaboratore | `..._rls_c_user_rollback.sql` |
| 11 | `20260923095100_rls_c_sites_organizations.sql` | risoluzione dominio, `/sites/select`, `/administration` organizzazioni e siti | `..._rls_c_sites_organizations_rollback.sql` |
| 12 | `20260923095200_rls_c_user_sites_organizations.sql` | pagina **Collaboratori**: elenco, aggiunta, rimozione, invito. Accettazione invito | `..._rls_c_user_sites_organizations_rollback.sql` |
| 13 | `20260923095300_rls_c_audit_roles_units.sql` | ruoli aziendali (creazione, modifica, assegnazione), unita' di misura a magazzino | `..._rls_c_audit_roles_units_rollback.sql` |

**Da fare prima del punto 3** (ondata A): decidere D-5, il cron `auto-archive`. Vedi R5.

Dopo il punto 13, la verifica di accettazione:

```sql
select relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```

## R3. File applicativi modificati

Due soli file, entrambi nello Step 7.

| File | Modifica | Perche' |
|---|---|---|
| `components/kanbans/KanbanBoard.tsx:1168` | `saveState()` → `saveState(domain)` | senza dominio la action legge i `Task` di **tutti** gli spazi. Con la RLS ne leggerebbe comunque solo quelli accessibili, ma lo snapshot resterebbe sporco fra spazi diversi |
| `app/sites/[domain]/kanban/actions/save-kanban-state.action.ts` | rimossi il filtro `.eq("site_id", …)` e il campo `site_id` nell'insert **su `TaskHistory`** | `TaskHistory` non ha quella colonna: le sue colonne sono `(id, "taskId", snapshot, "createdAt")`. I due rami non erano mai stati eseguiti perche' `siteId` restava `null`; passando il dominio avrebbero prodotto un errore `42703`. Lo scoping arriva dai `Task` filtrati a monte e, dopo l'ondata B, dalla policy via `Task` |

La logica degli snapshot **non** e' stata toccata: resta il lavoro separato indicato dal piano.
Aggiunti 3 test in `__tests__/kanban/save-kanban-state.test.ts` che bloccano la regressione.

**Nessun nuovo uso di `createServiceClient()`.**

## R4. Percorsi non autenticati o service-role ancora da proteggere (F-001)

Restano esposti **dopo** la RLS, perche' il service role la bypassa.

| Percorso | Client | Gate attuale | Cosa espone |
|---|---|---|---|
| `app/api/debug/database-tables/route.ts` | service | **nessuno** | enumerazione delle tabelle del DB |
| `app/api/debug/site-lookup/route.ts` | service | **nessuno** | lookup arbitrario su `sites` |
| `app/api/debug/vercel-env/route.ts` | service | **nessuno** | informazioni di ambiente e connettivita' |
| `lib/fetchers.ts::getSiteData()` | service | nessuno | risolve qualunque sottodominio a un `sites.*` completo, senza verificare la membership del chiamante. E' il cuore di `lib/site-context.ts` |
| `app/(auth)/quick-login/data.ts` | service | nessuno | elenco utenti non superadmin di uno spazio, per la quick-login |
| `app/api/sites/[domain]/attendance/route.ts` (GET) | service | `getUserContext()` presente ma la lettura bypassa la RLS | presenze dello spazio |
| altri 72 file con `createServiceClient()` | service | vario | elenco completo in [`accessi-completi.md`](rls-hardening/accessi-completi.md), righe con client `service` |

Le route `app/api/debug/{kanbans,basic,user-context,site-flow,site-navigation}` usano
il client di sessione: dopo la RLS restituiranno 0 righe agli anonimi. Miglioramento,
non regressione.

## R5. Decisioni che servono da Matteo

| # | Decisione | Stato | Raccomandazione |
|---|---|---|---|
| **D-1** | Backfill `Action.site_id` | proposta pronta, **non eseguita**, in `supabase/manual/20260923_action_backfill_site_id_PROPOSTA.sql` | recupera **18 righe su 1 867**: 34 in piu' da `clientId`, le restanti 1 815 non hanno nessun padre. Il ritorno e' basso, si puo' anche non fare nulla: restano visibili al superadmin |
| **D-2** | DELETE presenze: admin o collaboratore | **risolta dal codice**: POST e DELETE sono gia' entrambe gated da `isAdminOrSuperadmin()`. Applicato `user_is_site_admin(site_id)` | serve solo conferma |
| **D-3** | Risoluzione dominio → sito prima del login | **risolta**: usa il service role, il middleware non legge tabelle. Nessuno stop | resta F-001 da chiudere a parte |
| **D-4** | Migration solo sul remoto | 3 migration CRM del 10.09.2026, tutte su tabelle fuori perimetro con RLS gia' attiva | recuperarle in locale con `supabase db pull`, lavoro separato |
| **D-5** | **Cron `auto-archive`** | `app/api/cron/auto-archive/route.ts` usa `createClient()` (sessione) ma gira da Vercel Cron **senza utente**: dopo l'ondata A leggera' 0 `Task` e smettera' di archiviare, in silenzio | **da decidere PRIMA dell'ondata A.** Le opzioni sono: passare a `createServiceClient()` tenendo `CRON_SECRET` come unico gate, oppure dare al cron un utente di servizio. Non l'ho toccato: il vincolo chiede `withSiteAuth` per ogni nuovo service role, e a un cron non si applica |
| **D-6** | Fallback per email in `complete-signup` | `components/complete-signup.tsx:203` legge `User` per email **senza sessione**. Oggi funziona perche' la RLS e' spenta, cioe' oggi chiunque puo' leggere tutta la tabella `User` | dopo la RLS restituira' 0 righe. Nel flusso normale il fallback non viene percorso (la sessione esiste gia'). Va sostituito con una server action sulla sessione, o rimosso |
| **D-7** | `File` senza padre accessibili agli autenticati | scostamento applicato, motivato in migration | il fix strutturale e' aggiungere `site_id` (o `created_by`) alla tabella `File`. Fuori perimetro |
| **D-8** | Scrittura su `Roles` e `_RolesToUser` consentita agli admin, non ai soli superadmin | scostamento applicato, motivato in migration | per stringere a soli superadmin va prima cambiato il gate applicativo in `app/api/roles/**` e `app/api/users/[userId]/company-roles/`, altrimenti si rompe una funzione in uso |

## R6. Rischi residui e cosa non ho fatto

### Non ho eseguito il test di isolamento

`scripts/zztest-rls-isolation.ts` e' scritto, typecheckato e pronto, ma **non e' mai girato**:
su questa macchina **Docker non e' disponibile**, quindi `supabase start` non parte, e non
esiste un server PostgreSQL locale (c'e' solo il client `libpq`). Le alternative erano
applicare al remoto o creare un branch Supabase: entrambe vietate dai vincoli.

Quello che ho potuto verificare senza eseguire:

- la **sintassi** di tutti i 26 file SQL, con il parser di PostgreSQL (`libpg_query`);
- che le 41 tabelle ricevano tutte `enable row level security`, con un controllo automatico
  sui file confrontato con l'elenco del piano;
- lo **schema reale** di ogni tabella toccata (colonne, tipi, NOT NULL, indici, FK), letto
  dal remoto, cosi' che le policy e le fixture del test usino nomi di colonna esistenti.

Quello che **non** e' verificato e va verificato eseguendo lo script:

- che nessuna policy vada in ricorsione a runtime (le tre a rischio — `user_sites`,
  `user_organizations`, `organizations` — passano da helper `SECURITY DEFINER` apposta,
  ma la prova e' l'esecuzione);
- il corpo PL/pgSQL dei due blocchi `DO` (creazione indici, guardia su `TaskHistory`):
  il parser valida l'istruzione esterna, non il body;
- il costo reale della policy su `TaskHistory`.

**Va fatto prima di applicare al remoto.** La via piu' rapida: avviare Docker, poi
`supabase start && supabase db reset` e lanciare lo script. In alternativa un branch
Supabase dedicato (decisione tua, come previsto dal piano).

### Scostamenti dal piano applicati

Sette, tutti motivati da evidenze dello Step 0 e commentati nelle migration:

1. `is_superadmin()` **esisteva gia'**: ridefinita invece che creata; il rollback la ripristina anziche' droppare.
2. Gli indici su `TaskHistory("taskId")`, `user_sites` e `user_organizations` **esistevano gia'**: la migration usa un blocco `DO` che crea solo cio' che manca davvero.
3. Aggiunti tre helper nuovi (`user_in_organization`, `user_shares_tenancy_with`, `user_is_admin`): senza, le policy su `user_organizations` andrebbero in ricorsione e le dropdown collaboratori resterebbero vuote.
4. `File` senza padre: accessibili agli autenticati invece che ai soli superadmin (D-7).
5. `_RolesToUser` e `Roles`: scrittura agli admin, non ai soli superadmin (D-8).
6. `User` INSERT/DELETE e `user_organizations` INSERT: agli admin, non ai soli superadmin — invito collaboratori e cancellazione utenti passano dal client di sessione, non dal service role come ipotizzato dal piano.
7. Il test ZZTEST usa **due organizzazioni** invece di una: `user_can_access_site()` concede l'accesso anche per appartenenza all'organizzazione, quindi due siti nella stessa organizzazione sono reciprocamente accessibili **per disegno**. Con il setup del piano il test avrebbe fallito su una cosa corretta. Lo script verifica esplicitamente questo comportamento e lo stampa.

### Rischi residui

| Rischio | Gravita' | Mitigazione |
|---|---|---|
| Cron `auto-archive` si ferma in silenzio dopo l'ondata A | **alta** | D-5, da chiudere prima |
| `File` senza padre leggibili da qualunque autenticato | bassa (4 righe, nessun dato di tenant) | D-7 |
| Un admin puo' creare un `Roles` globale visibile ad altri spazi | bassa (e' il comportamento odierno) | D-8 |
| Insert su `Action` senza `site_id` vengono rifiutati | bassa (5 righe su 173 a settembre; l'esito non e' mai bloccante nel codice) | nessuna: e' il comportamento corretto |
| `user_is_site_admin()` richiede `enabled = true`: 1 admin sul DB ha `enabled = false` | trascurabile | quell'utente non supera comunque il gate applicativo |
| Costo della policy su `TaskHistory` (592k righe) non misurato | media | misurare con la `explain` in fondo alla migration; rollback dedicato pronto |
| Il service role resta il buco principale (78 file, 3 route di debug aperte) | **alta, ma fuori perimetro** | F-001, R4 |

### Cosa e' rimasto fuori per scelta

- Le 3 route di debug con service role senza gate: fuori perimetro, sono F-001.
- Le 3 migration CRM presenti solo sul remoto: non create, non modificate (D-4).
- Nessun `FORCE ROW LEVEL SECURITY`, nessuna modifica ai GRANT sulle tabelle.
  L'unica `revoke`/`grant` riguarda le funzioni nuove e `is_superadmin()`.
- Nessuna modifica a UI, icone, naming, `types/supabase.ts`, tabelle fuori perimetro.
- Nessuna modifica ai dati reali.
