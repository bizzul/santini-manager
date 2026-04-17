# Ordinamento card Kanban per data
_Exported on 17/04/2026 at 1:36:20 CEST from Cursor (3.1.15)_

---

**User**

Le card nelle Caban AVOR non sono in ordine di data di Posa.fai un controllo anche in tutte le altre Kanban e correggi l'ordine.

---

**Cursor**

Controllo dove viene costruito e ordinato il contenuto delle Kanban, poi verifico se l’ordinamento per data di posa manca anche in altre viste e applico una correzione coerente.

Sto seguendo il flusso dati delle Kanban dashboard, perché l’ordine potrebbe essere deciso lato server e poi riutilizzato da piu viste.

Ho visto che la dashboard AVOR non gestisce l’ordine delle card: ora controllo la Kanban vera e propria, dove vengono caricate e ordinate le task nelle colonne.

Ho trovato il punto: nella board Kanban c’è una regola speciale per le work-kanban che nel `To Do` ordina per `termine_produzione`, mentre le card mostrano la `Data di posa` (`deliveryDate`). Ora riallineo l’ordinamento e lo rendo coerente anche nelle altre Kanban.

Sto aggiornando la regola di sorting centralizzata della board: rimuovo l’eccezione che rompe AVOR e rendo l’ordinamento consistente su tutte le Kanban, con fallback stabile quando manca la data.

La correzione è applicata; sto facendo un ultimo controllo sul codice aggiornato per confermare che l’ordinamento ora sia uniforme e senza regressioni evidenti.

Ho corretto l’ordinamento delle card nella Kanban in `components/kanbans/KanbanBoard.tsx`.

Il problema era che nelle work-kanban AVOR la colonna `To Do` veniva ordinata per `termine_produzione`, mentre le card mostrano la `Data di posa` (`deliveryDate`). Ora la regola è coerente su tutte le Kanban:
- `Trattativa` nelle offerte continua a ordinare per `sent_date`
- `SPED` continua a ordinare per codice
- tutte le altre colonne ordinano per `Data di posa`, con fallback stabile a `termine_produzione` e poi a codice/id se manca la data

Ho anche fatto un controllo linter sul file modificato e non risultano errori. Non ho eseguito una verifica visuale della board nel browser; se vuoi posso fare anche un check rapido su una Kanban specifica.

