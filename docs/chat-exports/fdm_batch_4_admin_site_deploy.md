# Batch 4 - Admin / Sito / DB / Deploy / Chat agenti / Calendar (prompt operativo)

Copia tutto il blocco sottostante in una chat nuova.

```text
Sei un agente di verifica e miglioria per il progetto FDM.

OBIETTIVO
Verificare se le modifiche discusse nelle chat "Admin / Sito / DB / Deploy /
Chat agenti / Calendar" sono effettivamente operative nel repository
~/santini-manager. Poi produrre un piano di miglioria realistico. Nessun
push remoto, niente operazioni distruttive su produzione.

VINCOLI
- Tempo max sessione: 45 minuti.
- Budget max token: 200 USD (stop + check se superi ~70%).
- Autonomia: non chiedere conferme, usa la Unblock Policy se bloccato.
- Non fare git push.
- Non esporre credenziali/token in chat (segnalarli se presenti).

INPUT - chat da analizzare (in /Users/matteopaolocci/Desktop/cursor_exp):
1. cursor_dettagli_sito_e_gestione_utenti.md
2. cursor_site_details_editing.md
3. cursor_controllo_architettura_database.md
4. cursor_virtual_agent_chat_modifications.md
5. cursor_missing_online_changes_with_mit.md
6. cursor_github_login_and_push.md
7. cursor_weekly_calendar_view_redesign.md
8. cursor_process_termination_on_ports_300.md

REPO target: /Users/matteopaolocci/santini-manager
File chiave presumibili (verifica):
- app/(administration)/administration/sites/[id]/edit/EditSiteForm.tsx
- components/site-settings/*Modal.tsx
- components/site-theme-style.tsx
- components/site-settings/SiteThemeColorsConfigurator.tsx
- components/assistance/GlobalSupportAssistant.tsx (chat agente)
- app/api/voice-input/** (voice agent flows)
- components/calendar/WeeklyCalendarView.tsx
- app/sites/[domain]/calendar/** page
- supabase/migrations/* (audit architetturale)
- docs/AUDIT-*.md (se esistono)
- lib/server-data.ts (fetchCollaborators, audit relazioni)

FASE A - VERIFICA OPERATIVITA
Per ogni chat input:
1. Leggi la chat, estrai: richiesta, soluzione, file toccati.
2. Verifica nel repo:
   - Admin sito: larghezza form, tema in "Impostazioni", card assistenza.
   - Site details editing: applicazione modifiche da PDF (moduli Fabbrica,
     Prodotti, HR, logo/immagine).
   - Architettura DB: documenti `docs/AUDIT-*.md` presenti e coerenti.
   - Chat agenti: apertura su click, nomi distinti; Overview data vuoti
     mitigato (query Supabase fragili).
   - Missing online changes: branch allineato, commit attesi su main.
   - GitHub push: permessi, eventuali token in chat da revocare.
   - Weekly calendar: design unificato stile Kanban, filtri, ore.
   - Porte 3000/3001: documentazione troubleshooting / script dev.
3. Classifica stato per ciascuna chat: OK | PARZIALE | MANCANTE | REGRESSIONE.

FASE B - SMOKE CHECK STATICI
- `git log -20 --oneline` per verificare commit recenti vs ci che le chat
  dichiarano come "fatto".
- `git status --short --branch` e `git fetch` (solo fetch) per confronto
  locale/remoto. Non fare push/pull.
- `rg "ghp_|github_pat_"` per individuare eventuali token residui in chat
  o file di progetto (solo segnala, non cancellare).
- `npm run build` (tail 40 righe) per sicurezza.
- `npm test -- --testPathPattern='(kanban-categor|site|calendar)'` se ha senso.

FASE C - PIANO MIGLIORIA
Per ogni elemento non OK proporre:
- Quick win: documento `docs/DEV-TROUBLESHOOTING.md` con porte, processi,
  reset localStorage, comandi cache.
- Quick win: script di verifica remota (`npm run verify:online`) che legge
  `origin/main` e fa un `curl -I` su URL chiave.
- Media: refactoring query `fetchDashboardData` separando join pesanti.
- Alta: pipeline release guidata (commit -> push -> deploy check -> migration
  check -> smoke) integrata con note release automatiche.

Migliorie trasversali:
- Rotazione PAT GitHub + policy "no token in chat" (snippet rule in
  `.cursor/rules`).
- `docs/SECURITY-PLAYBOOK.md` con gestione credenziali/escalation.
- Template GitHub issue/PR con sezione "impact area" (UI/API/DB).

FORMATO OUTPUT
Scrivere tutto in un unico file:
Desktop/cursor_exp/fdm_batch_4_report.md

Struttura obbligatoria:
## Sintesi (tabella 8 righe)
## Dettaglio per chat
## Smoke check statici
## Piano miglioria (Quick win / Media / Alta)
## 3 azioni immediate (< 2 ore)
## Rischi sicurezza e operativi
## Allegati (eventuali riferimenti a token/permessi da rivedere)

STOP CONDITIONS
- Token esposti: STOP immediato, segnala.
- Build rotta: stop con root cause.
- Superamento budget: stop e chiedi conferma.

UNBLOCK POLICY
Se bloccato: leggi fdm_unblock_policy.md nella cartella, estrai 5 chat
casuali e riprendi dall'ipotesi a rischio minore.
```
