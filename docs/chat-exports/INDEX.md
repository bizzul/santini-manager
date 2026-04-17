# Indice export (`docs/chat-exports`)

| File | Tipo | Nota breve |
|------|------|------------|
| `cursor_agente_configurazione_e_analisi.md` | chat | Setup multi-agente Matt Max + export chat |
| `cursor_bacheca_kanban_offerte.md` | chat | Kanban / offerte |
| `cursor_cambiamento_dashboard_overview.md` | chat | Dashboard overview |
| `cursor_controllo_architettura_database.md` | chat | Audit architettura dati → deliverable `AUDIT-ARCH-DATA-*.md` |
| `cursor_dettagli_progetto_nel_menu_repor.md` | chat | Dettaglio progetto nel menu report |
| `cursor_dettagli_sito_e_gestione_utenti.md` | chat | Dettagli sito e utenti |
| `cursor_exp_batch_analysis_and_bootstrap_prompt.md` | prompt | Fase A–C + comandi bootstrap (`git`, `npm run build`) |
| `cursor_fdm_overview_dashboard_layout_re.md` | chat | Layout overview FDM |
| `cursor_github_login_and_push.md` | chat | Git login/push (**conteneva PAT — redatto**) |
| `cursor_grafica_prodotti_dashboard_produ.md` | chat | Grafica prodotti dashboard produzione |
| `cursor_impaginazione_scheda_progetto copia.md` | chat | Copia export scheda progetto |
| `cursor_impaginazione_scheda_progetto.md` | chat | Impaginazione scheda progetto |
| `cursor_inconsistenza_numeri_dashboard_p.md` | chat | Numeri dashboard incoerenti |
| `cursor_inserimento_ore_e_tabelle_export.md` | chat | Ore e export tabelle |
| `cursor_installation_date_timezone_issue.md` | chat | Date installazione / timezone |
| `cursor_layout_e_filtri_pagine_report.md` | chat | Layout e filtri report |
| `cursor_leggibilit_sottocategorie_menu_l.md` | chat | Menu laterale / sottocategorie Kanban |
| `cursor_missing_online_changes_with_mit.md` | chat | Modifiche non online (MIT/push) |
| `cursor_modifiche_alla_visualizzazione_t.md` | chat | Tabella progetti inline edit |
| `cursor_modifiche_pagina_presenze.md` | chat | Pagina presenze (IPG, colori, utenti) |
| `cursor_nuovo_modulo_per_registrazione_o.md` | chat | Modulo ore / ferie→vacanze, policy SQL |
| `cursor_ordinamento_card_kanban_per_data.md` | chat | Ordinamento card Kanban per data |
| `cursor_process_termination_on_ports_300.md` | chat | Kill processi porte 3000/3001 |
| `cursor_regole_di_accesso_e_visualizzazi.md` | chat | Accessi progetto, allineamento locale/online |
| `cursor_site_details_editing.md` | chat | Sito, avatar, clienti, migrazioni (**segreti redatti**) |
| `cursor_virtual_agent_chat_modifications.md` | chat | Chat agenti virtuali (Vera/Aura/Mira), dashboard |
| `cursor_weekly_calendar_view_redesign.md` | chat | Calendario settimanale |
| `fdm_agent_1_analisi.md` | prompt | Agente analisi |
| `fdm_agent_2_implementazione.md` | prompt | Agente implementazione |
| `fdm_agent_3_qa.md` | prompt | Agente QA |
| `fdm_agent_4_release.md` | prompt | Agente release |
| `fdm_batch_1_kanban_projects.md` | prompt | Batch 1: Kanban & progetti |
| `fdm_batch_2_dashboard_reports.md` | prompt | Batch 2: Dashboard & report |
| `fdm_batch_3_hr_timetracking.md` | prompt | Batch 3: HR / timetracking |
| `fdm_batch_4_admin_site_deploy.md` | prompt | Batch 4: Admin, sito, deploy |
| `fdm_batch_5_aggregator.md` | prompt | Aggregatore → `fdm_final_plan.md` (previsto su Desktop) |
| `fdm_master_orchestrator.md` | prompt | Orchestrator 4 agenti |
| `fdm_post_release_retro.md` | prompt | Retro post-release |
| `fdm_report_stato_e_piano.md` | report | Sintesi `cursor_exp` + stato git/build + piano operativo |
| `fdm_unblock_policy.md` | policy | Ripresa da 5 chat casuali in caso di stallo |
| `fdm_verification_and_improvement_master.md` | piano | Mappa 24 `cursor_*` → batch 1–4 e output attesi |

**Totale file .md in repo:** 41

## Batch (per verifica operatività)

Definito in `fdm_verification_and_improvement_master.md`:

- **Batch 1:** Kanban & progetti (6 chat)
- **Batch 2:** Dashboard & report (5 chat)
- **Batch 3:** HR / presenze / timetracking (5 chat)
- **Batch 4:** Admin / sito / DB / deploy / agenti / calendario (8 chat)

I report attesi `fdm_batch_<N>_report.md` e `fdm_final_plan.md` nel piano originale puntavano al Desktop; la prossima esecuzione può scriverli in `docs/agents-reports/` per versionamento.
