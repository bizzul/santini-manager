# Batch 1 Report - Kanban & Progetti

## Sintesi esecutiva (5 bullet max)

- **Scheda progetto / modal Kanban (`editKanbanTask`)**: layout a due colonne 50/50, riquadri `Immagine` + `Info Cantiere` in griglia, `Storico progetto` collassabile con scroll, sezione `Collaboratori` con ore; API e campi pianificazione/collaboratori presenti nel repo.
- **Ordinamento Kanban**: `KanbanBoard.tsx` allinea l’ordinamento non-offerta a `deliveryDate` (con fallback), coerente con la richiesta “data di posa”.
- **Tabella progetti**: colonne inline (`EditableSelectCell`, date, note), link codice su `projects?edit=`, assenza di navigazione al click sulla riga; pagina consuntivo `progetti/[id]` limitata ad admin/superadmin.
- **Accessi e navigazione**: `Card.tsx` con link codice/cliente e click area → consuntivo per admin; `createForm` nasconde colonna/offerta/posizioni quando creazione embedded in kanban.
- **Gap vs chat “regole” / allineamento locale**: `NEXT_PUBLIC_FORCE_LOCAL_CARD_PREFS` **non** trovato nel codice; card **compressa** senza link sul codice (`span`); sfondo modale in `Card.tsx` non è più `bg-slate-900` come in una fase della chat “leggibilità” (sostituito da `!bg-background` / tema).

## Chat-per-chat

### cursor_impaginazione_scheda_progetto.md
- **Richiesta**: Riprogettare la colonna destra della scheda (Info cantiere accanto al prodotto/immagine, storico compatto, box collaboratori+ore); poi unificare “Immagine”, proporzioni 50/50, rimozioni UI, planner produzione/posa con collaboratori, ecc.
- **Evidenze codice**: `components/kanbans/editKanbanTask.tsx:145-1460` (`Form` + `flex w-1/2`), `1462-1534` (griglia `Immagine` / `Info Cantiere`), `1593-1691` (`Collapsible` storico), `1693-1717` (`Collaboratori`), `app/api/tasks/[taskId]/time-summary/route.ts:1-40`, `app/api/collaborators/route.ts` (presente), `app/api/kanban/tasks/[id]/route.ts` (campi `produzione_*`, `posa_*` citati in grep), `types/supabase.ts:67-77` (`assigned_collaborator_ids`, date pianificazione).
- **Stato**: **OK**
- **Azioni residue**: `editKanbanTask` non referenzia esplicitamente `time-summary` via grep (ore probabilmente da `collaboratorTimeSummaries` lato server): **DA VERIFICARE** se il riepilogo ore è sempre allineato al endpoint dedicato.

### cursor_impaginazione_scheda_progetto copia.md
- **Richiesta**: Stesso thread export duplicato (stesso contenuto della chat precedente).
- **Evidenze codice**: Stesse di `cursor_impaginazione_scheda_progetto.md`.
- **Stato**: **OK**
- **Azioni residue**: Nessuna (duplicato documentale).

### cursor_leggibilit_sottocategorie_menu_l.md
- **Richiesta**: Sidebar più leggibile per sottocategorie Kanban; margini `SidebarMenuSub`; sezione “Ordini fornitori” a tutta larghezza; modale più larga; sfondo dialog e container (evoluzione fino a slate solido).
- **Evidenze codice**: `components/ui/sidebar.tsx:647-653` (`SidebarMenuSub` con `ml-4 mr-0` e `pl-3 pr-0`), `components/ui/sidebar.tsx:30-31` (`SIDEBAR_WIDTH` / `MOBILE` = `18rem`), `components/kanbans/editKanbanTask.tsx:2461-2474` (“Ordini fornitori” sotto il blocco due colonne), `components/kanbans/Card.tsx:1238-1239` (`DialogContent` `w-[95vw] max-w-[1100px]` — **non** `bg-slate-900` come nella fase slate della chat).
- **Stato**: **PARZIALE**
- **Azioni residue**: Confermare se l’abbandono dello sfondo slate (`!bg-slate-900`) è voluto (sostituito da `!bg-background dark:!bg-muted` in `Card.tsx:1238`); allineare aspettative con `cursor_regole` (larghezze uniformi).

### cursor_bacheca_kanban_offerte.md
- **Richiesta**: Allineare “locale vs online” (Git, localStorage), rollout commit, script console; nessuna feature UI nuova nel senso di componenti.
- **Evidenze codice**: Preferenze kanban in `components/kanbans/KanbanBoard.tsx:1049-1140` (lettura/scrittura `localStorage`); **nessun** “Reset preferenze Kanban” in UI citato nella chat.
- **Stato**: **OK** (per “non c’era una modifica funzionale da versionare nel codice” o **PARZIALE** se ci si aspettava il pulsante “Reset preferenze” promesso).
- **Azioni residue**: Eventuale pulsante “Reset preferenze Kanban” in UI (**MANCANTE** rispetto alla proposta in chat, non alla richiesta iniziale).

### cursor_ordinamento_card_kanban_per_data.md
- **Richiesta**: Ordinare le card per data di posa (es. AVOR) e coerenza tra Kanban.
- **Evidenze codice**: `components/kanbans/KanbanBoard.tsx:285-314` (`sortCards`: `Trattativa` → `sent_date`; `SPED` → codice; default → `compareByDate` con `deliveryDate`, `delivery_date`, `termine_produzione`, …).
- **Stato**: **OK**
- **Azioni residue**: Nessuna a livello di logica centrale; validazione visuale su board reali consigliata.

### cursor_modifiche_alla_visualizzazione_t.md
- **Richiesta**: Tabella progetti con editing inline, link sul codice, colonne Kanban/Reparto, senza navigazione sulla riga; restyling pagina dettaglio stile card.
- **Evidenze codice**: `app/sites/[domain]/projects/columns.tsx:17-19`, `321` (link `projects?edit=`), `415-456` (Kanban + Reparto), `app/sites/[domain]/projects/table.tsx:419-422` (riga senza `onClick` navigazione), `components/table/editable-select-cell.tsx` (e altri `editable-*` presenti).
- **Stato**: **OK** (per Step 1 + presenza componenti); **DA VERIFICARE** se il restyling completo della pagina `progetti/[id]` è allineato alla card (richiede confronto visivo/manuale con `app/sites/[domain]/progetti/[id]/page.tsx` oltre i primi 80 righe).
- **Azioni residue**: Smoke UI sulla pagina dettaglio progetto post-Step 2.

### cursor_regole_di_accesso_e_visualizzazi.md
- **Richiesta**: Unificare navigazione (codice → modal tipo kanban), consuntivo solo admin, form creazione da `+` semplificato, click su card estesa (codice/cliente/area), larghezze modali, neutralizzazione differenze dev/prod (`NEXT_PUBLIC_*`, localStorage).
- **Evidenze codice**: `app/sites/[domain]/projects/columns.tsx:321` (`href` `projects?edit=`), `app/sites/[domain]/progetti/[id]/page.tsx:254-255` (redirect non-admin), `app/sites/[domain]/projects/createForm.tsx:298-328`, `502-528` (`!isKanbanEmbeddedCreation` per Colonna / griglia Pos), `components/kanbans/Card.tsx:354-400`, `727-732`, `813-820`, `components/kanbans/Card.tsx:560-562` (`NEXT_PUBLIC_SHOW_COVER_SOURCE_BADGE`), `app/sites/[domain]/projects/dialogEdit.tsx:29`, `dialogCreate.tsx:31`, `components/kanbans/KanbanBoard.tsx:409` (`max-w-[1100px]`), `app/sites/[domain]/clients/dataWrapper.tsx:16-31` (`searchParams.get("edit")`).
- **Stato**: **PARZIALE**
- **Azioni residue**: `NEXT_PUBLIC_FORCE_LOCAL_CARD_PREFS` **non** presente nel repo (grep vuoto): disabilitazione persistenza preferenze su localhost **MANCANTE** o non implementata. Card **small**: `components/kanbans/Card.tsx:1030-1031` codice come `<span>` senza `handleOpenProjectSheet` (**PARZIALE** vs opzione “card ridotta” in coda alla chat).

## Matrice stato
| Chat | Stato | Effort residuo (S/M/L) |
|------|-------|------------------------|
| cursor_impaginazione_scheda_progetto.md | OK | S |
| cursor_impaginazione_scheda_progetto copia.md | OK | - |
| cursor_leggibilit_sottocategorie_menu_l.md | PARZIALE | S |
| cursor_bacheca_kanban_offerte.md | OK / PARZIALE | S |
| cursor_ordinamento_card_kanban_per_data.md | OK | - |
| cursor_modifiche_alla_visualizzazione_t.md | OK | S |
| cursor_regole_di_accesso_e_visualizzazi.md | PARZIALE | M |

## Top 5 migliorie (quick win)

1. Implementare o rimuovere dalla documentazione `NEXT_PUBLIC_FORCE_LOCAL_CARD_PREFS` se non serve più.
2. Decidere se il codice progetto sulla **card compressa** deve essere cliccabile come su quella estesa (`Card.tsx` ~1030).
3. Verifica end-to-end flusso ore `collaboratorTimeSummaries` vs `GET /api/tasks/[taskId]/time-summary`.
4. UI “Reset preferenze Kanban” (opzionale) per chiudere il gap con `cursor_bacheca_kanban_offerte.md`.
5. Smoke test pagina dettaglio progetto dopo Step 2 tabella (`progetti/[id]`).

## Rischi/Regressioni rilevate

- **Sfondo modale**: `Card.tsx:1238` usa `!bg-background dark:!bg-muted` invece dello `slate` solido richiesto in una fase di `cursor_leggibilit_*` — possibile **disallineamento** rispetto a quella richiesta, ma coerente con `cursor_regole` (larghezze uniformi).
- **Preferenze locali**: `localStorage` ancora usato in `KanbanBoard.tsx` / `Card.tsx` → diff locale/online **persistono** (come da chat bacheca); piano “no persist su localhost” **non** confermato nel codice.

## Dipendenze con audit dati (F-001..F-020 in docs/AUDIT-ARCH-DATA-FINDINGS-BACKLOG.md)

- **F-001**: Endpoint `app/api/tasks/[taskId]/time-summary/route.ts` usa service client + contesto sito; coerente con il tema “verifica membership” su API service-role.
- **F-003**: Rilevanza per client/task CRUD da modali; navigazione ora usa query `?edit=` ma le route “mancanti” restano backlog di prodotto.
- **F-003 / F-004**: `GET /api/tasks` e aggregazioni task — collegato a coerenza dati tabella/kanban e `collaboratorTimeSummaries`.
- **F-010**: `select("*")` / query pesanti in `lib/server-data.ts` — impatta caricamento elenco progetti e task per editing inline.
- **F-020**: Naming misto (`deliveryDate` vs `delivery_date` in sort `KanbanBoard.tsx:308-314`) — allineato al finding su schema misto.
