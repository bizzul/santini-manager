# Batch 5 - Aggregatore finale (prompt operativo)

Da eseguire DOPO che i batch 1-4 hanno prodotto i rispettivi report:
- Desktop/cursor_exp/fdm_batch_1_report.md
- Desktop/cursor_exp/fdm_batch_2_report.md
- Desktop/cursor_exp/fdm_batch_3_report.md
- Desktop/cursor_exp/fdm_batch_4_report.md

Copia tutto il blocco sottostante in una chat nuova.

```text
Sei un agente "release manager" per il progetto FDM.

OBIETTIVO
Consolidare i 4 report prodotti dai batch precedenti in un unico piano
esecutivo:
1) Stato globale verifica operativita (OK / PARZIALE / MANCANTE / REGRESSIONE)
2) Roadmap miglioria ordinata (Quick win -> Media -> Alta complessita)
3) Release plan realistico su 2 sprint (2 settimane ciascuno)
4) Dashboard di rischio e mitigazione

VINCOLI
- Tempo max 45 minuti, budget token 200 USD soft limit.
- Nessun push remoto.
- Nessuna modifica di codice applicativo (solo docs/config).
- Autonomia totale.

INPUT (leggere tutti)
- Desktop/cursor_exp/fdm_batch_1_report.md
- Desktop/cursor_exp/fdm_batch_2_report.md
- Desktop/cursor_exp/fdm_batch_3_report.md
- Desktop/cursor_exp/fdm_batch_4_report.md
- Desktop/cursor_exp/fdm_report_stato_e_piano.md (contesto precedente)
- Desktop/cursor_exp/fdm_verification_and_improvement_master.md

FASE A - CONSOLIDAMENTO STATO
- Estrarre conteggi globali: N.chat, OK, PARZIALE, MANCANTE, REGRESSIONE.
- Identificare i 5 punti con maggior impatto business se NON operativi.
- Segnalare regressioni trovate (codice modificato dopo la chat che ha
  rotto l'intervento).

FASE B - ROADMAP MIGLIORIE
Classificare tutte le migliorie dei batch in:
- Quick win (< 4h effort, rischio basso)
- Media (1-2 giorni, rischio medio)
- Alta complessita (settimanale+, rischio alto)

Per ogni voce:
- Titolo
- Area (Kanban, Dashboard, HR, Admin, DB, Deploy)
- Impatto (alto/medio/basso)
- Effort (S/M/L)
- File coinvolti
- Dipendenze
- Test consigliati

FASE C - RELEASE PLAN 2 SPRINT
Sprint 1 (settimane 1-2): Quick win + Media priorita alta.
Sprint 2 (settimane 3-4): Media rimanenti + Alta con maggior ROI.
Per ogni sprint:
- Obiettivo
- Backlog ordinato (max 10 voci)
- Criteri di accettazione
- Gate release (checklist)

FASE D - DASHBOARD RISCHI
Elenco 10 rischi principali con:
- Probabilita (alta/media/bassa)
- Impatto (alto/medio/basso)
- Mitigazione primaria
- Owner suggerito (ruolo, non nome)

FORMATO OUTPUT
Scrivere tutto in:
Desktop/cursor_exp/fdm_final_plan.md

Struttura obbligatoria:
# FDM - Piano Finale Verifica + Miglioria
## 1. Stato verifica operativa (tabella globale + 5 priorita)
## 2. Roadmap migliorie (3 sezioni: Quick/Media/Alta)
## 3. Release plan Sprint 1
## 4. Release plan Sprint 2
## 5. Dashboard rischi (tabella)
## 6. Next actions immediate (top 5 entro 24h)
## 7. Appendice: riferimenti batch 1-4

STOP CONDITIONS
- Input mancante (uno dei 4 report non esiste): stop e segnala.
- Superamento budget: stop e chiedi conferma.

UNBLOCK POLICY
Se bloccato, leggere fdm_unblock_policy.md e riprendere da 5 chat casuali.
```
