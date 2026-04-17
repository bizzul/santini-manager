---

# Stream 2 - Data Consistency & Transactions

## Sommario esecutivo

L’audit conferma **F-005** e **F-011** sul codice attuale: permessi utente con catena **delete multi-tabella + insert** senza transazione; audit/inventory e move task con **update + `Action`** non atomici; import CSV e duplicazioni kanban/task con **commit parziali** o **errori ignorati**. Esiste già **`get_next_sequence_value`** in migrazione e uso da `lib/code-generator.ts`, ma restano **fallback e sequenze interne** non serializzate come un’unica operazione DB. La roadmap **M2** (RPC transazionali, riduzione `delete+insert`, pattern retry/rollback) resta **allineata** al gap osservato; non emergono contraddizioni sostanziali, solo che alcuni deliverable M2 non sono ancora implementati lato applicazione.

## Findings nuovi (S2-F<NN>)

| ID | Evidenza | Problema |
|----|----------|----------|
| **S2-F001** | `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts:59-99` | Dopo `Kanban.insert` le colonne sono inserite in ciclo con `await supabase.from("KanbanColumn").insert(...)` **senza controllo `error`**: fallimento a metà lascia kanban senza tutte le colonne. |
| **S2-F002** | `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts:42-55` + insert `59-78` | Risoluzione `identifier` univoco a colpi di `select` + retry: **race/TOCTOU** tra due richieste concorrenti. |
| **S2-F003** | `app/sites/[domain]/kanban/actions/delete-kanban.action.ts:60-145` | Eliminazione in **5+ passi** (update `Task`, update colonne, delete colonne, delete kanban) **senza transazione**: interruzione tra passi lascia DB incoerente (es. colonne cancellate ma kanban ancora presente, o task scollegate senza completamento). |
| **S2-F004** | `app/sites/[domain]/timetracking/actions/edit-item.action.ts:131-150` | `delete` su `_RolesToTimetracking` poi `insert`; se l’insert fallisce si **prosegue comunque** (“Continue anyway”): ruoli persi rispetto allo stato precedente. |
| **S2-F005** | `app/sites/[domain]/kanban/actions/duplicate-item.action.ts:119-191` | Task clonato poi `TaskSupplier` e `File`; errore su fornitori/file **dopo** insert task → **task orfano** senza rollback. |
| **S2-F006** | `app/api/kanban/tasks/move/route.ts:613-631` | Percorso `movedTask`: `Action.insert` con **`await` senza verifica errore** (a differenza del ramo principale `735-743`). |
| **S2-F007** | `app/api/kanban/tasks/move/route.ts:532-610` | Creazione **QC/Packing** con più `insert` in `Promise.all`: fallimento parziale può lasciare `QualityControl`/`PackingControl` senza tutti gli item figli. |
| **S2-F008** | `app/api/sell-products/import-csv/route.ts:271-419` | Modalità `apply`: loop riga-per-riga con **insert/update codice in più round-trip**; righe già scritte **non vengono rollbackate**; `Action` riepilogativo solo a fine (`422-433`). Coerente con stato parziale batch. |
| **S2-F009** | `lib/code-generator.ts:590-662` | `getNextInternalSequenceValue`: lettura max da `Task` + **update/insert** su `code_sequences` **non in un’unica transazione atomica** lato DB; commento a riga 653-658 ammette race. |
| **S2-F010** | `app/api/manufacturers/import-csv/route.ts:339-407` | Update/insert batch **senza transazione**; `Action` batch dopo insert: **manufacturer importati ma audit mancante** se `Action.insert` fallisce. |

## Findings audit esistenti confermati

**F-005** (`high`, Area C) — **Confermato.**  
`app/api/sites/[domain]/users/[userId]/permissions/route.ts:146-252`: commento esplicito che non c’è transazione vera (`146-148`); sequenza `delete` su `user_module_permissions` → `user_kanban_permissions` → `user_kanban_category_permissions`, poi `insert` ripetuti; errore dopo un `delete` successivo lascia permessi **vuoti o parziali**. Ordine errato rispetto a `assistance_level`: check superadmin **dopo** i delete (`254-275`), quindi fallimento 403 su assistance lascia comunque **permessi già cancellati**.

**F-011** (`medium`, Area C) — **Confermato.**  
- `app/api/inventory/uniqueId/[id]/route.ts:38-68`: `products.update` poi `Action.insert`; su `actionError` solo `console.error`, **nessun rollback** dell’update.  
- `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts`: vedi S2-F001.  
- `app/api/sell-products/import-csv/route.ts`: vedi S2-F008; `lib/sell-product-import.ts` pianifica anche `update`/`duplicateIdsToDeactivate` ma l’apply route analizzata esegue sostanzialmente il flusso **insert** (coerente con `plannedUpdates: 0` nello summary in `lib/sell-product-import.ts` ~330-520): rischio di **incompletezza funzionale** oltre alla non atomicità.

## RPC candidate (tabella)

| Nome suggerito | Scopo | Firma SQL suggerita | File chiamanti attuali | Rischio race / nota |
|----------------|-------|---------------------|-------------------------|---------------------|
| *(esistente)* **`get_next_sequence_value`** | Incremento atomico sequenza offerta/lavoro/fattura | Già in `supabase/migrations/20251210100000_offer_system.sql:95-114` `p_site_id uuid, p_sequence_type text, p_year int` | `lib/code-generator.ts:228-233` | Basso per incremento; restano race su **sync post-RPC** vs `Task` (`341-371`) se due processi aggiornano fuori ordine. |
| **`replace_user_site_permissions`** | Sostituire in un’unica transazione righe modulo/kanban/categoria + opzionale `User.assistance_level` | `p_site_id uuid, p_user_id uuid, p_modules text[], p_kanban_ids int[], p_category_ids int[], p_assistance_level text, p_update_assistance boolean` | `app/api/sites/[domain]/users/[userId]/permissions/route.ts` | Alto senza RPC (già visto F-005). |
| **`move_task_update_with_action`** | `UPDATE Task` + insert `Action` (e opz. campi offerta) | `p_task_id int, p_site_id uuid, p_payload jsonb, p_action jsonb` | `app/api/kanban/tasks/move/route.ts`, `app/api/inventory/uniqueId/[id]/route.ts` | Medio: riduce disallineamento update/audit. |
| **`duplicate_kanban_tree`** | Clona `Kanban` + tutte le `KanbanColumn` con identificativi stabili | `p_source_kanban_id int, p_site_id uuid, p_title_suffix text` | `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts` | Alto: colonne parziali (S2-F001); vincolo UNIQUE su `identifier` mitigabile con lock o `ON CONFLICT`. |
| **`delete_kanban_safe`** | Scollega task, elimina colonne e kanban in un’unica transazione | `p_kanban_id int, p_site_id uuid` | `app/sites/[domain]/kanban/actions/delete-kanban.action.ts` | Medio: stati intermedi attuali (S2-F003). |
| **`timetracking_replace_roles`** | Sostituisce join `_RolesToTimetracking` in un solo statement | `p_timetracking_id int, p_role_id int` | `app/sites/[domain]/timetracking/actions/edit-item.action.ts` | Medio: elimina finestra delete+insert. |
| **`get_next_internal_sequence_value`** | `SELECT … FOR UPDATE` su riga `code_sequences` + allineamento max `Task` | `p_site_id uuid, p_category_id int, p_base_code int, p_year int` | `lib/code-generator.ts` (`getNextInternalSequenceValue`) | Alto: race su sequenza interna (S2-F009). |
| **`apply_sell_product_import_batch`** | Applicare N righe pianificate in transazione o sotto-savepoint per riga | `p_site_id uuid, p_entries jsonb` | `app/api/sell-products/import-csv/route.ts` | Alto per import CSV; alternativa: **una transazione per file** con rollback totale su errore. |

## Quick wins

- Verificare **`error`** su ogni `insert` nel loop di `duplicate-kanban.action.ts` e fallire con messaggio chiaro (mitiga S2-F001; ideale dentro RPC).  
- In `move/route.ts` ramo `movedTask`, controllare esito **`Action.insert`** come nel ramo standard (`735-743`).  
- In `timetracking` `edit-item.action.ts`, non “continuare comunque” se l’insert ruoli fallisce: al minimo **rollback manuale** o retry (meglio RPC `timetracking_replace_roles`).  
- Post permessi: spostare la validazione **superadmin** per `assistance_level` **prima** dei delete (`permissions/route.ts`).

## Interventi strutturali

- Introdurre **RPC transazionali** allineate a M2 per: permessi, move task complessi, duplicate/delete kanban, sequenze interne.  
- Pattern **import**: transazione unica o savepoint per riga + policy esplicita su “tutto o niente” vs “best effort” documentata.  
- **`duplicate-item`**: compensazione (delete task creato) o RPC che inserisce task+relazioni in una transazione.  
- Test di carico/concorrenza su **identifier kanban** e **codici task** duplicati.

## Contraddizioni con la roadmap

Nessuna contraddizione logica: M2 chiede RPC e riduzione stati parziali; il codice **non** li implementa ancora in modo sistematico, quindi il backlog resta valido. Unica nota: **`get_next_sequence_value` esiste già** in migrazione: M2 può essere interpretato come “estendere lo stesso pattern” alle altre aree, non come “creare da zero tutte le RPC”.

## Domande aperte

- Policy desiderata per **import CSV**: commit per riga (stato parziale accettato) vs **rollback globale** su prima errore?  
- I piani `SellProduct` con `action === "update"` e `duplicateIdsToDeactivate` devono essere **implementati** in `apply` o sono solo preview?  
- Per **delete kanban**, è accettabile lasciare task con `kanbanId`/`kanbanColumnId` null in caso di errore a metà, o serve vincolo di atomicità assoluto?

---

**Nota scope:** `modules/*/services/` contiene principalmente **get/list** senza mutazioni transazionali rilevanti; `lib/offers.ts` e `lib/project-consuntivo.ts` sono **logica/pure types**, senza accesso DB nel tratto letto. `lib/actions.ts` combina update DB con chiamate Vercel (`117-134`): incoerenza **DB vs provider esterno** non risolvibile solo con transazioni Postgres (pattern saga/compensazione).
