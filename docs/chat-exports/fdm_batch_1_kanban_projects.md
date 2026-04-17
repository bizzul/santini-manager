# Batch 1 - Kanban & Progetti (prompt operativo)

Copia tutto il blocco sottostante in una chat nuova.

```text
Sei un agente di verifica e miglioria per il progetto FDM.

OBIETTIVO
Verificare se le modifiche discusse nelle chat "Kanban & Progetti" sono
effettivamente operative nel repository ~/santini-manager. Poi produrre
un piano di miglioria realistico. Nessun push remoto, nessuna migration
applicata a produzione.

VINCOLI
- Tempo max sessione: 45 minuti.
- Budget max token: 200 USD (stop + check se superi ~70%).
- Autonomia: non chiedere conferme, usa la Unblock Policy se bloccato.
- Non fare git push.
- Commit locali solo se aggiungi test o documentazione non invasiva.

INPUT - chat da analizzare (in /Users/matteopaolocci/Desktop/cursor_exp):
1. cursor_impaginazione_scheda_progetto.md
2. cursor_leggibilit_sottocategorie_menu_l.md
3. cursor_bacheca_kanban_offerte.md
4. cursor_ordinamento_card_kanban_per_data.md
5. cursor_modifiche_alla_visualizzazione_t.md
6. cursor_regole_di_accesso_e_visualizzazi.md

REPO target: /Users/matteopaolocci/santini-manager
File chiave presumibili (verifica):
- components/kanbans/KanbanBoard.tsx
- components/kanbans/Card.tsx
- components/kanbans/editKanbanTask.tsx
- components/kanbans/OfferMiniCard.tsx
- components/kanbans/OfferQuickAdd.tsx
- app/sites/[domain]/projects/* (editForm, columns, dialogEdit)
- app/sites/[domain]/progetti/[id]/page.tsx
- components/app-sidebar.tsx

FASE A - VERIFICA OPERATIVITA
Per ogni chat input, procedere cosi:
1. Leggere la chat, estrarre: richiesta principale, soluzione descritta,
   file/riga citati, risultato dichiarato.
2. Aprire i file reali nel repo e verificare:
   - il pattern e presente (classe CSS, prop, sort, import, ecc.)
   - la build attuale compila (npm run build -> tail 30 righe)
   - i test eventuali sono verdi (npm test --testPathPattern=<area>)
3. Classificare stato per ogni chat: OK | PARZIALE | MANCANTE | REGRESSIONE
4. Se manca qualcosa, annotare il delta esatto (prop mancante, sort sbagliato,
   regola permessi assente, ecc.).

FASE B - SMOKE CHECK FUNZIONALI (statico, senza browser)
Verifica via `rg` o lettura file:
- Ordinamento card kanban per data di posa: sort su deliveryDate/termine_produzione.
- Scheda progetto: riquadri Info Cantiere / Storico / Collaboratori / Documenti
  presenti e nella colonna destra; pulsanti "Assegna collaboratori" per
  produzione e posa distinti.
- Regole di accesso: consuntivo solo admin/superadmin; link verso vista
  progetto unificata; `?edit=` query supportata.
- Sidebar: classi di leggibilita per sottocategorie menu; margine corretto
  di `SidebarMenuSub`.
- Kanban offerte: differenze locale vs online note, presenza
  "Reset preferenze" (aggiunto di recente nella toolbar board).
- Tabella progetti: editing inline, link codice, split kanban/reparto,
  dettaglio stile card.

FASE C - PIANO MIGLIORIA
Per ogni stato diverso da OK, proporre azioni con:
- Descrizione breve
- Impatto (alto/medio/basso)
- Effort (S/M/L)
- File coinvolti
- Test suggeriti

In aggiunta, proporre 3-5 migliorie trasversali a Kanban/Progetti:
- Riduzione duplicazione editForm vs editKanbanTask
- Test di contratto API task (create/patch/move)
- Rimozione fallback ambigui su colonne DB mancanti
- UI: uniformare "assegnazione collaboratori" anche nella vista progetti
  standard (oltre a kanban)
- Policy localStorage (documentata o gestita da hook condiviso)

FORMATO OUTPUT
Scrivere tutto in un unico file:
Desktop/cursor_exp/fdm_batch_1_report.md

Struttura obbligatoria:
## Sintesi (1 tabella con 6 righe: stato per chat)
## Dettaglio per chat (una sezione ciascuna, ordine come input)
## Smoke check funzionali (elenco con OK/KO e prove)
## Piano miglioria (Quick win / Media / Alta complessita)
## 3 azioni immediate (< 2 ore di lavoro totale)
## Rischi aperti

STOP CONDITIONS
- Build spezzata: ferma, documenta cause.
- Test suite rotta: ferma, non forzare.
- Superamento budget: stop e richiesta conferma.

UNBLOCK POLICY
Se non riesci a procedere:
1. Rileggi fdm_unblock_policy.md nella stessa cartella.
2. Seleziona casualmente 5 chat aggiuntive da cursor_* non gia usate.
3. Estrai pattern utili.
4. Applica l'azione a rischio minore.
5. Riprendi il flusso dove eri bloccato.
```
