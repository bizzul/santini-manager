# FDM - Piano Master: verifica operativita + piano miglioria

Scopo: verificare in modo sistematico se le modifiche discusse nelle 24 chat
`cursor_*` della cartella `Desktop/cursor_exp` sono effettivamente operative sul
repository `~/santini-manager` e proporre un piano di miglioria.

## Vincoli globali
- Nessun push remoto (solo commit locali ammessi se strettamente necessari).
- Ogni chat autonoma deve stare in ~45 minuti e ~200$ di token.
- Lavoro parallelo su 4 chat: Kanban/Progetti, Dashboard/Report, HR/Timetracking, Admin/Sito/DB/Deploy.
- Stop conditions: build rotta, test rotti, rischio dati in produzione.
- Unblock policy: se in stallo, leggere `fdm_unblock_policy.md` e riprendere da 5 chat casuali.

## Mappa chat -> aree funzionali

### Batch 1 - Kanban & Progetti
- `cursor_impaginazione_scheda_progetto.md`
- `cursor_leggibilit_sottocategorie_menu_l.md`
- `cursor_bacheca_kanban_offerte.md`
- `cursor_ordinamento_card_kanban_per_data.md`
- `cursor_modifiche_alla_visualizzazione_t.md`
- `cursor_regole_di_accesso_e_visualizzazi.md`

### Batch 2 - Dashboard & Report
- `cursor_cambiamento_dashboard_overview.md`
- `cursor_fdm_overview_dashboard_layout_re.md`
- `cursor_inconsistenza_numeri_dashboard_p.md`
- `cursor_grafica_prodotti_dashboard_produ.md`
- `cursor_layout_e_filtri_pagine_report.md`

### Batch 3 - HR / Presenze / Timetracking
- `cursor_modifiche_pagina_presenze.md`
- `cursor_nuovo_modulo_per_registrazione_o.md`
- `cursor_inserimento_ore_e_tabelle_export.md`
- `cursor_dettagli_progetto_nel_menu_repor.md`
- `cursor_installation_date_timezone_issue.md`

### Batch 4 - Admin / Sito / DB / Deploy / Chat agenti / Calendar
- `cursor_dettagli_sito_e_gestione_utenti.md`
- `cursor_site_details_editing.md`
- `cursor_controllo_architettura_database.md`
- `cursor_virtual_agent_chat_modifications.md`
- `cursor_missing_online_changes_with_mit.md`
- `cursor_github_login_and_push.md`
- `cursor_weekly_calendar_view_redesign.md`
- `cursor_process_termination_on_ports_300.md`

## Output atteso per ogni batch
Ogni chat deve produrre un report markdown con:

1. Per ciascuna chat analizzata:
   - Cosa si chiedeva
   - Cosa risulta effettivamente presente nel repo (riferimento file/riga)
   - Stato: `OK`, `PARZIALE`, `MANCANTE`, `REGRESSIONE`
   - Prove: test, build, query, screenshot concettuale
2. Matrice di sintesi con conteggi per stato
3. Lista migliorie (Quick win / Media / Alta complessita) con:
   - Descrizione
   - Impatto atteso
   - Effort stimato
   - File da toccare
4. 3 azioni immediate (max 2 ore di lavoro totale)

## Coordinamento
- Tutti i batch scrivono il loro report in `Desktop/cursor_exp/fdm_batch_<N>_report.md`.
- Nessuno deve fare push, nessuno deve modificare codice di produzione senza QA.
- Se serve una modifica esplorativa: branch locale `exp/batch-<N>` o semplice diff non commitato.

## Lettura consigliata
- `fdm_unblock_policy.md`
- `fdm_agent_1_analisi.md`
- `fdm_report_stato_e_piano.md` (output precedente)
- `docs/FEATURE-FLAGS.md` (nel repo)
- `docs/RELEASE-CHECKLIST-FDM.md` (nel repo)
