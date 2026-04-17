# Batch 2 - Dashboard & Report (prompt operativo)

Copia tutto il blocco sottostante in una chat nuova.

```text
Sei un agente di verifica e miglioria per il progetto FDM.

OBIETTIVO
Verificare se le modifiche discusse nelle chat "Dashboard & Report" sono
effettivamente operative nel repository ~/santini-manager. Poi produrre
un piano di miglioria realistico. Nessun push remoto.

VINCOLI
- Tempo max sessione: 45 minuti.
- Budget max token: 200 USD (stop + check se superi ~70%).
- Autonomia: non chiedere conferme, usa la Unblock Policy se bloccato.
- Non fare git push.
- Commit locali solo se aggiungi test o documentazione non invasiva.

INPUT - chat da analizzare (in /Users/matteopaolocci/Desktop/cursor_exp):
1. cursor_cambiamento_dashboard_overview.md
2. cursor_fdm_overview_dashboard_layout_re.md
3. cursor_inconsistenza_numeri_dashboard_p.md
4. cursor_grafica_prodotti_dashboard_produ.md
5. cursor_layout_e_filtri_pagine_report.md

REPO target: /Users/matteopaolocci/santini-manager
File chiave presumibili (verifica):
- components/dashboard/**/*.tsx
- components/dashboard/produzione/ProduzioneCalendarWeeklySummary.tsx
- components/dashboard/produzione/ProduzioneProductWorkloadChart.tsx (se esiste)
- components/dashboard/prodotti/ResaleCategoryChart.tsx
- app/sites/[domain]/dashboard/** (page.tsx delle varie dashboard)
- components/reports/GridReports.tsx
- app/api/reports/**/*.ts
- lib/server-data.ts (aggregazioni KPI)
- lib/product-category-label.ts (helper nuovo appena introdotto)

FASE A - VERIFICA OPERATIVITA
Per ogni chat input:
1. Leggi la chat, estrai: richiesta, soluzione, file toccati, esito dichiarato.
2. Apri i file reali e verifica:
   - refactor Overview: presenza di `DashboardOverviewShell` o equivalenti
   - grafico categorie produzione: sorgente dati, color/label coerenti
   - inconsistenza numeri: confronto fra KPI card e chart nella stessa dashboard
   - grafica prodotti: componente referenziato in "prodotti" vs "produzione"
   - Report: filtri uniformi, export allineato al filtro UI
3. Classifica stato per ciascuna chat: OK | PARZIALE | MANCANTE | REGRESSIONE.

FASE B - SMOKE CHECK STATICI
- Esegui `rg "SellProduct\?\.category\?\.name"` e verifica che i punti
  rimasti siano compatibili con il nuovo helper
  `getProductCategoryLabelAndColor` (se non lo sono, segnala).
- Verifica che la `produzione` workload e il `calendarWeeklySummary` usino la
  stessa fonte di aggregazione per evitare discrepanze tra KPI e grafico.
- Verifica che gli endpoint report accettino filtri coerenti con la UI
  (categoria, area, date range).
- Controlla build: `npm run build` (tail 40 righe).
- Controlla test: `npm test -- --testPathPattern='(product-category|reports|dashboard)'`.

FASE C - PIANO MIGLIORIA
Per ogni elemento non OK proporre:
- Quick win: adozione helper categoria dove ancora manca, test snapshot
  KPI vs chart.
- Media: allineamento filtri UI<->backend su `/api/reports/*`.
- Alta: modello dati aggregato condiviso tra Overview e dashboard verticali
  (riduce query duplicate in `lib/server-data.ts`).

Migliorie trasversali da proporre:
- Contract test per funzioni `lib/server-data.ts` critiche (KPI produzione,
  workload, valori prodotti attivi) con fixture deterministici.
- Documentazione `docs/DASHBOARD-DATA-MODEL.md` con mappa dei dati
  disponibili per ogni card/grafico.
- Modalita debug overlay (feature flag) che mostri fonte dati per ciascun
  componente dashboard.

FORMATO OUTPUT
Scrivere tutto in un unico file:
Desktop/cursor_exp/fdm_batch_2_report.md

Struttura obbligatoria:
## Sintesi (tabella 5 righe: stato per chat)
## Dettaglio per chat (una sezione ciascuna)
## Smoke check statici (elenco con esito + prova)
## Piano miglioria (Quick win / Media / Alta)
## 3 azioni immediate (< 2 ore)
## Rischi aperti

STOP CONDITIONS
- Build o test rotti: stop e root cause.
- Superamento budget: stop e chiedi conferma.

UNBLOCK POLICY
Se bloccato: leggi fdm_unblock_policy.md nella cartella, estrai 5 chat
casuali e riprendi dall'ipotesi a rischio minore.
```
