# Stream 3 - Query Performance & N+1

## Sommario esecutivo

**F-010 è confermato**: `select("*")` compare in modo sistematico in `lib/server-data.ts`, nelle API ad alto volume (`app/api/kanban/tasks/route.ts`, `app/api/clients/route.ts` e molte altre) e nei moduli `modules/*/services`. Non emergono N+1 classici nel path principale kanban (usa `Promise.all` + map in memoria), mentre sì **loop sequenziali con `await`** in `app/api/qcItems/[id]/route.ts`. Le aggregazioni per report ore/errori avvengono **lato applicazione** dopo aver caricato dataset larghi. Gli indici recenti (`20260408163000_add_task_delete_indexes.sql`, ecc.) coprono FK verso `task_id`/`taskId`; restano **lacune probabili** su filtri frequenti (`Task.site_id`+`archived`, `Timetracking(site_id, created_at)`, `Action.clientId`/`supplierId`). La roadmap **M3** è allineata: riduzione `*`, paginazione, coerenza cache; nessuna contraddizione strutturale.

---

## Hotlist top 20

| file:linee | query / pattern | problema | fix proposto | severity |
|------------|-----------------|----------|--------------|----------|
| `lib/server-data.ts:116-120` | `Client.select("*")` full site | payload massimo, colonne inutili | proiezione esplicita + eventuale paginazione | high |
| `lib/server-data.ts:131-141` | `Action` + `User` embed, `limit(500)` | ultima azione per cliente **troncata** se >500 azioni globali | `DISTINCT ON`/RPC o subquery SQL per “latest per client” | high |
| `lib/server-data.ts:322-325` | `SellProduct` `*` + join category | `*` + sort JS dopo (vedi sotto) | colonne minime + `ORDER BY` in SQL | medium |
| `lib/server-data.ts:347-358` | sort client-side categorie/nome | aggregazione/ordinamento non in DB | `order` su join category | medium |
| `lib/fetchers.ts:35-39,71-75` | `sites.select("*").eq("subdomain").single()` | `*`; `.single()` su lookup dominio | colonne necessarie; valutare indice univoco subdomain (schema) | medium |
| `app/api/kanban/tasks/route.ts:85-88` | `Kanban`+`Task` `select("*")` | lettura intere righe task per board | proiezioni per UI kanban; indice `(site_id, archived, kanbanId)` | critical |
| `app/api/kanban/tasks/route.ts:165-209` | `KanbanColumn`, `Client`, `File`, `QC`, `Packing`, `TaskSupplier` + `Supplier(*)` | join/embed pesanti; `File`/`*` molto voluminoso | colonne per card; lazy load allegati; ridurre `Supplier(*)` | critical |
| `app/api/kanban/tasks/route.ts:354-431` | map in memoria (totals collaboratori) | CPU/mem su client server OK ma O(n·m) | accettabile se dataset bounded; altrimenti SQL rollup | medium |
| `app/api/reports/time/route.ts:368-376` | `Timetracking` `*` + task `*` + ruoli annidati | full scan (filtra `site_id` se header) senza range DB | `WHERE created_at` + indice composto; proiezioni | critical |
| `app/api/reports/time/route.ts:418-435` | `User.select("*")` enabled + filtro `user_sites` | possibile set grande | colonne report + paginazione utenti | high |
| `app/api/reports/time/route.ts:455-471` | `userEnabled.map` + `filterTimetrackings` | aggregazione per utente in JS | GROUP BY / materialized per report | high |
| `app/api/reports/errors/route.ts:44-52` | `Errortracking` con join, **senza** filtro sito nel frammento mostrato | rischio dataset globale + filtro data in JS | `WHERE site_id` + range `updated_at` in SQL | critical |
| `app/api/kanban/snapshot/route.ts:13-41` | `TaskHistory` annidato + `Task` con 4 relazioni `*` | query enorme, doppio fetch storia/corrente | snapshot incrementale o limit per timestamp | critical |
| `app/api/quick-actions/data/route.ts:57-70,84-89` | `Client`, `SellProduct`, `Kanban`, `Task` tutti `*` | liste complete per form | limit + campi form | high |
| `app/api/clients/route.ts:47-50` | `Client` `*` senza paginazione | lista illimitata per tenant | cursor/limit | high |
| `app/api/products/route.ts:34-37` | `Product` `*` | idem | paginazione + colonne | high |
| `app/api/sell-products/route.ts:25-33` | `SellProduct` `*` + join + sort JS | idem F-010 | ORDER BY in SQL + colonne | medium |
| `app/api/users/list/route.ts:8-10` | `users.select("*")` **senza filtro** | leak volumetrico / tutti i record | filtro tenant + paginazione; verificare auth | critical |
| `app/api/kanban/tasks/move/route.ts:533-535,577-580` | `QcMasterItems`/`PackingMasterItems` `select("*")` | lettura cataloghi completi a ogni move | cache in-memory o colonne minime | medium |
| `modules/clients/service/get.ts:12-16` (e analoghi) | `Client.select("*").single()` | pattern CRUD generico pesante | DTO per contesto | low |

---

## Indici mancanti (candidati)

| tabella | colonna/e | query giustificanti |
|---------|-----------|---------------------|
| `Task` | `(site_id, archived)` o `(site_id, kanbanId, archived)` | `app/api/kanban/tasks/route.ts` filtro principale; `quick-actions` tasks |
| `Timetracking` | `(site_id, created_at DESC)` | `app/api/reports/time/route.ts` `order("created_at")` + `eq("site_id")` |
| `Action` | `(clientId)`, `(supplierId)`, eventualmente `(site_id, createdAt DESC)` | `lib/server-data.ts` `in("clientId")` / `in("supplierId")` + last action |
| `Errortracking` | `(site_id)` o `(supplier_id, updated_at)` | report errori per fornitore/intervallo (`app/api/reports/errors/route.ts`) |
| `TaskHistory` | `(created_at)`, `(taskId)` | snapshot storico + order (`app/api/kanban/snapshot/route.ts`) — verificare copertura rispetto a query |

Nota: esistono già indici utili (`idx_taskhistory_taskid`, `idx_timetracking_task_id`, `idx_client_site_id`, `idx_user_sites_site_id`, ecc. in `supabase/migrations/`); la tabella sopra integra dove il codice filtra ancora senza indice composito ottimale.

---

## Paginazione mancante (endpoint rappresentativi)

- `/Users/matteopaolocci/santini-manager/app/api/clients/route.ts` — GET lista completa  
- `/Users/matteopaolocci/santini-manager/app/api/products/route.ts` — GET  
- `/Users/matteopaolocci/santini-manager/app/api/sell-products/route.ts` — GET (+ sort client)  
- `/Users/matteopaolocci/santini-manager/app/api/kanban/tasks/route.ts` — GET (tutti i task del sito o kanban senza `limit`)  
- `/Users/matteopaolocci/santini-manager/app/api/users/list/route.ts` — GET globale  
- `/Users/matteopaolocci/santini-manager/app/api/reports/time/route.ts` — POST export (carica tutto poi filtra)  
- `/Users/matteopaolocci/santini-manager/app/api/reports/errors/route.ts` — POST export  
- `/Users/matteopaolocci/santini-manager/app/api/kanban/snapshot/route.ts` — GET  
- `/Users/matteopaolocci/santini-manager/app/api/quick-actions/data/route.ts` — GET `project` / `timetracking`  
- `/Users/matteopaolocci/santini-manager/app/api/roles/route.ts` — GET (insieme ruoli può crescere)  

*(Soglia “>500” non misurabile staticamente: dipende dai dati tenant; il pattern è “nessun `range`/`limit` sulle liste principali”.)*

---

## N+1 rilevati

| file:linee | problema | proposta batching |
|------------|----------|-------------------|
| `app/api/qcItems/[id]/route.ts:33-72` | `for (const { id } of body.items) { await ... }` — query sequenziali per ogni item + ricarica `qc_items` | una query `UPDATE ... FROM` / RPC; raggruppare `quality_control_id` e una sola SELECT per QC padre + un UPDATE stato |
| `app/api/qcItems/[id]/route.ts:16-29` | `Promise.all` su update per riga | accettabile come parallelismo; meglio bulk update se Postgres/Supabase lo consente |

`app/api/kanban/tasks/move/route.ts:541-572` usa `map` async ma `Promise.all` — **non** N+1 sequenziale; è burst parallello (attenzione solo al numero di round-trip).

---

## Findings nuovi S3-F&lt;NN&gt;

- **S3-F001** — `app/api/users/list/route.ts`: `select("*")` senza filtro tenant visibile nel handler; rischio lista globale e payload illimitato (**critical**).  
- **S3-F002** — `app/api/reports/time/route.ts`: caricamento massivo `Timetracking` con join e aggregazioni in JS (**high**).  
- **S3-F003** — `app/api/reports/errors/route.ts`: query `Errortracking` senza predicati temporali/tenant in SQL; filtri dopo in memoria (**high**).  
- **S3-F004** — `lib/server-data.ts` `fetchClients` / `fetchSuppliers`: `limit(500)` su `Action` rende “ultima azione” **semanticamente errata** sotto carico (**high**).  
- **S3-F005** — Indici compositi mancanti su `Task(site_id, …)` e `Timetracking(site_id, created_at)` rispetto ai filtri più usati (**medium**).  
- **S3-F006** — `app/api/qcItems/[id]/route.ts`: loop con `await` su aggiornamento stato QC (**high** N+1).

---

## Findings audit esistenti confermati

- **F-010** (`docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md`): `select("*")` in `lib/server-data.ts`, `app/api/kanban/tasks/route.ts`, `app/api/clients/route.ts` — **confermato**; esteso a decine di route e `lib/fetchers.ts`.

---

## Quick wins

1. Sostituire `*` con liste colonne nelle API più chiamate (`kanban/tasks`, `clients`, `sell-products`).  
2. Aggiungere `limit` + `cursor` o almeno `max` difensivo sulle GET lista.  
3. Correggere `app/api/users/list/route.ts` con filtro autorizzazione e ambito sito.  
4. Report time/errors: spostare filtri `date`/`site_id` nella query Supabase.  
5. `fetchClients` last action: query dedicata “latest action per client” (finestra o SQL).  

---

## Interventi strutturali

- RPC/materialized views per report ore e errori con GROUP BY / window functions.  
- Contratto API kanban: split “board summary” vs “task detail” (allegati, QC full).  
- Policy indici: revisione pianificata dopo `EXPLAIN` su produzione (M3).  

---

## Contraddizioni con la roadmap

Nessuna: **M3** richiede esattamente proiezioni, paginazione e allineamento cache; questo audit rafforza le stesse priorità.

---

## Domande aperte

- Volume atteso per task/clienti per sito in produzione (per tarare paginazione vs cursor)?  
- `TaskHistory` + snapshot: è accettabile un limite temporale o solo ultimi N record?  
- Tabella `users` vs `User`: chi usa `/api/users/list` e quali RLS/permessi si applicano?

---

## Stima impatto (top 5) — ordine di grandezza

Senza metriche runtime, stima **qualitativa** (bytes ∝ righe × colonne selezionate; tempo ∝ scan + join + serializzazione JSON):

1. **`app/api/kanban/tasks/route.ts` (GET)** — Moltiplicatore alto: `Task` full row × N + `File`/`QC`/`Packing`/`TaskSupplier` per tutti i `task_id`. Con migliaia di task, payload **multi-MB** e tempo **centinaia di ms–secondi**.  
2. **`app/api/reports/time/route.ts` (POST)** — Tutte le righe timetracking (per sito o peggio) × join `task`/`User`/ruoli; memoria e tempo **O(righe)** prima dei filtri JS.  
3. **`app/api/kanban/snapshot/route.ts` (GET)** — Doppio full graph su storico + corrente; stesso ordine di grandezza del punto 1.  
4. **`lib/server-data.ts` `fetchClients` + Action** — Due round-trip; il secondo può essere **errato** (cap 500) o comunque grande; payload client `*` su tutti i clienti.  
5. **`app/api/users/list/route.ts`** — Un solo `select *` ma su tabella **globale** `users`: rischio estremo di righe se non limitata da RLS.

---

*Percorsi assoluti come richiesto; analisi statica read-only, senza misure DB reali.*
