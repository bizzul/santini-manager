# FDM Overview dashboard layout refactor
_Exported on 17/04/2026 at 1:40:43 CEST from Cursor (3.1.15)_

---

**User**

Apply this only to the Overview dashboard page, without touching other pages yet.

Refactor the FDM Overview dashboard page into a strict desktop-first proportional layout system.

GOAL
Standardize the Overview dashboard so that it fits cleanly within a desktop viewport, avoids internal scrolling, and uses a mathematically coherent panel structure derived from the FDM visual system.

MAIN RULES
- Desktop first
- No internal scroll inside main dashboard panels
- Keep the current business logic and data bindings unchanged
- Keep the current dark premium SaaS visual language
- Sidebar open/closed must not change the structural layout, only available width distribution

DESKTOP LAYOUT TARGET
Use a 12-column grid with:
- 24px horizontal page padding
- 16px vertical page padding
- 16px gap between sections and panels

CONTENT MAX WIDTH
- max-width: 1600px
- width: 100%

VERTICAL PAGE STRUCTURE
Create the page as 5 main stacked zones:

1. top module navigation strip
- fixed height: 48px

2. page title / subtitle area
- fixed height: 56px

3. KPI row
- 4 equal cards
- each card spans 3 columns
- fixed height: 120px

4. main charts row
- 2 equal panels
- each panel spans 6 columns
- fixed height: 280px

5. bottom summary row
- 2 equal panels
- each panel spans 6 columns
- fixed height: 232px

All panels in the same row must have identical height.

ANTI-SCROLL RULE
Avoid internal scrolling in all main overview panels.
This page is a dashboard summary page, not a full archive page.

Therefore:
- KPI cards: never scroll
- chart panels: never scroll
- bottom summary panels: never scroll
- notifications panel should display only a limited preview (max 4 or 5 items), with a “view all” action if more items exist
- do not allow overflowing lists to create nested scrollbars

KPI CARD STANDARDIZATION
Standardize the 4 KPI cards:
- same internal padding
- same icon position
- same typography hierarchy
- same spacing between title, main value, sublabel, and delta/change
- remove unused empty visual space
- keep them compact and information-dense

CHART PANEL STANDARDIZATION
Standardize the 2 chart panels:
- identical header height
- identical body height
- identical internal padding
- charts should align visually inside the panels
- keep chart areas balanced and centered
- avoid extra empty space

BOTTOM PANELS STANDARDIZATION
Standardize:
1. Stato Kanban Aggregato
2. Ultime notifiche

Requirements:
- same outer height
- same panel header structure
- same internal padding

For Stato Kanban Aggregato:
- create a rigid internal 2x2 card grid
- all four internal cards must have identical size and spacing

For Ultime notifiche:
- show a fixed preview count only
- avoid vertical overflow
- preserve a clean summary layout

SIDEBAR OPEN/CLOSED BEHAVIOR
When the sidebar collapses:
- do not change the number of cards/panels per row
- do not change row structure
- only allow panels to expand horizontally in a controlled way
- preserve all row heights

OUTPUT
Produce a reusable dashboard layout structure that can later be reused by other FDM overview pages.
Do not implement one-off fixes only for this page.

---

**Cursor**

Let me start by exploring the current dashboard structure and all related components.

Now let me also check the page layout components.

Now I have a clear picture of the current structure. Let me implement the full refactoring.

Now let me update DashboardTabs with the `compact` prop and the dashboard page to use the new layout system.

Now update the main dashboard page to use the new layout system.

Now let me verify the final state of all files and check for linter errors.

No linter errors. Let me verify the dev server compiles correctly.

Everything looks clean. Let me do a final verification of all the modified files.

All changes are complete with zero linter errors. Here's a summary of the refactoring:

---

**New file created:**
- `components/dashboard/DashboardOverviewLayout.tsx` — reusable layout system exporting `DashboardOverviewShell`, `OVERVIEW_HEIGHTS`, `OVERVIEW_GRID`, and `PANEL_CLASSES`

**Files modified (8 total):**

| File | Changes |
|---|---|
| `page.tsx` | Replaced `PageLayout`/`PageHeader`/`PageContent` with `DashboardOverviewShell` + 5 fixed-height zones using 12-column grid |
| `DashboardTabs.tsx` | Added `compact` prop (default `false`) — removes sticky, reduces padding/font/icon sizes to fit 48px. Non-compact mode is identical to original. |
| `KPICards.tsx` | Extracted reusable `KPICard` subcomponent with standardized structure (icon top-left, delta top-right, label/value/sublabel stacked). Uses `grid-cols-12` with `col-span-3` per card. |
| `PipelineChart.tsx` | Compact header (w-9 icon, text-sm title), chart height reduced from 300px to 200px, `h-full overflow-hidden` |
| `DepartmentWorkloadChart.tsx` | Same treatment as PipelineChart — matching header height, chart height, and padding |
| `AggregatedKanbanStatus.tsx` | Flex-column layout with `flex-1 min-h-0` content area. 2x2 grid cards use `justify-center` and `overflow-hidden` |
| `LatestNotifications.tsx` | Compact single-line items (message + timestamp inline), capped at 4 items, shared `PanelHeader` subcomponent for consistency |

**Layout math (total vertical):**
- 48 (nav) + 56 (title) + 120 (KPIs) + 280 (charts) + 232 (bottom) = 736px content
- 4 x 16px gaps = 64px
- 2 x 16px vertical padding = 32px
- **Total: 832px** — fits within standard 1080p viewport

**What stays unchanged:**
- All business logic and data bindings
- Other dashboard sub-pages (forecast, vendita, avor, etc.)
- `PageLayout`/`PageHeader`/`PageContent` remain untouched for other pages
- Sidebar open/closed behavior — only available width changes, row structure is preserved

---

**User**

1. situazione attuale.
2. Concetto di rapporto container e schermate da applicare

---

**Cursor**

## 1) Situazione attuale

Dal risultato visivo, il layout ora e` **formalmente a griglia corretta**, ma **non sta usando bene il canvas disponibile**:

- i blocchi rimangono concentrati in alto a sinistra, con molto spazio vuoto a destra/sotto;
- le altezze sono fisse (ok per la regola desktop), ma non sono ancora legate al rapporto con lo spazio reale della viewport;
- alcuni contenuti (soprattutto chart + notifiche) diventano troppo compressi quando il contenitore utile e` piu` stretto del previsto;
- quindi hai coerenza strutturale, ma non ancora la resa “proporzionale” tipo sistema UNI A che vuoi ottenere.

## 2) Concetto “rapporto container/schermate” da applicare

Il principio giusto e` trattare l’Overview come un **canvas master** (desktop) e poi scalare **le proporzioni**, non la struttura.

- **Canvas base**: `1600 x 832` (quello che abbiamo definito: 5 zone + gap + padding).
- **Rapporto fisso zone verticali** (derivato dal master):
  - nav: `48/832 = 5.77%`
  - title: `56/832 = 6.73%`
  - KPI: `120/832 = 14.42%`
  - charts: `280/832 = 33.65%`
  - bottom: `232/832 = 27.88%`
- **Regola viewport**:
  - larghezza container: `min(100%, 1600px)`
  - altezza utile: `viewport - chrome (header/sidebar offset)`
  - applicare le 5 altezze come proporzioni dell’altezza utile, con `clamp()` per evitare pannelli troppo piccoli.
- **Regola sidebar open/closed**:
  - cambia solo `available width`;
  - **mai** cambiare: 12 colonne, 4 KPI, 2+2 pannelli, altezze relative.
- **Anti-scroll coerente**:
  - niente scrollbar interne;
  - i moduli “lista” devono fare preview (es. 4-5 righe) + CTA “Vedi tutte”.

Se vuoi, nel prossimo step te lo trasformo direttamente in token/layout matematico nel codice (con variabili CSS + `clamp`) cosi` il comportamento e` identico su tutte le overview FDM.

---

**User**

prova, perchè il risultato è peggiore di prima.

---

**Cursor**

Hai ragione, lo sistemo subito: rifaccio il layout dell’Overview in modo più robusto (proporzionale al viewport, leggibile, senza compressioni), mantenendo invariata la logica dati. Adesso controllo i file reali e applico una patch mirata.

Ho individuato il problema: l’impostazione attuale è troppo “rigida” e comprime male alcune aree. Faccio una seconda iterazione più solida: canvas desktop fisso/centrato, righe proporzionate ma leggibili, e componenti meno schiacciati.

Sto applicando anche un fix tecnico per evitare il comportamento “a colonne strette” che si vede nello screenshot: imposto i wrapper pannello con `min-w-0 h-full` e ridimensiono i chart in modo più stabile. Ora faccio check lint/build.

Hai ragione: quel comportamento “schiacciato” era peggiorativo.  
Ho fatto una seconda passata **mirata solo su Overview** per stabilizzare il layout.

Cosa ho corretto ora:

- `DashboardOverviewShell` reso più robusto:
  - `min-h-[832px]`
  - `overflow-x-hidden` e scroll solo della pagina (`overflow-y-auto`)
  - contenitore interno con `min-h-[832px]` per evitare collassi
- Wrapper dei pannelli principali in `page.tsx`:
  - aggiunti `min-w-0 h-full` su tutte le colonne `col-span-6`
  - questo evita i casi in cui i chart diventano colonne strette/illeggibili
- `PipelineChart` e `DepartmentWorkloadChart`:
  - layout interno `flex flex-col` più stabile
  - header meno compresso e più leggibile
  - area chart portata a `216px` per miglior equilibrio visivo

Tutto resta coerente con i vincoli:
- solo pagina Overview
- nessun cambio business logic/data binding
- nessuno scroll interno nei pannelli principali
- sidebar open/closed non altera struttura righe/colonne

Se vuoi, nel prossimo step faccio l’ultimo affinamento “pixel-level” (tipografia KPI + densità bottom row) sulla base di **una tua screenshot aggiornata dopo hard refresh** (`Cmd+Shift+R`), così lo portiamo esattamente al livello “prima ma meglio”.

---

**User**

ancora troppo rigido, riapplica la formattazione originale. (Quella applicata alla altre dashboard.

---

**Cursor**

Perfetto, faccio rollback della sola Overview al layout originale (stessa impostazione delle altre dashboard) mantenendo invariata la logica dati. Ripristino ora `page.tsx` e i componenti visuali dashboard che avevamo irrigidito.

Completo il rollback con `LatestNotifications` e `DashboardTabs` alla versione originale, poi faccio check lint.

Ricevuto: ho ripristinato l’Overview alla formattazione originale (coerente con le altre dashboard).

Cosa ho fatto:

- Ripristinato `app/sites/[domain]/dashboard/page.tsx` a:
  - `PageLayout`
  - `DashboardTabs` standard (sticky)
  - `PageHeader`
  - `PageContent` con `space-y-6` e le due righe `md:grid-cols-2`
- Ripristinati i componenti visuali originali:
  - `components/dashboard/KPICards.tsx`
  - `components/dashboard/PipelineChart.tsx`
  - `components/dashboard/DepartmentWorkloadChart.tsx`
  - `components/dashboard/AggregatedKanbanStatus.tsx`
  - `components/dashboard/LatestNotifications.tsx`
- Ripristinato `components/dashboard/DashboardTabs.tsx` senza modalità `compact`.
- Rimosso il file introdotto per il layout rigido:
  - `components/dashboard/DashboardOverviewLayout.tsx`

Verifiche:

- Nessun errore lint sui file toccati.

Se vuoi, nel prossimo passaggio posso fare solo una micro-ottimizzazione non invasiva (spaziatura/contrasto) mantenendo il layout identico all’originale.

---

**User**

procedi!

---

**Cursor**

Procedo con una micro-ottimizzazione non invasiva: miglioro leggibilità e ritmo visivo (spaziature, gerarchie testo, bordi) lasciando invariata la struttura attuale della dashboard.

Applico ora un affinamento “soft”: stessi blocchi e stessa struttura, solo miglioramenti di densità/leggibilità visiva (padding, bordi, gerarchia header), senza alterare il comportamento.

Ho finito gli affinamenti visivi; faccio subito il controllo lint e un diff rapido per confermarti esattamente l’impatto.

Fatto. Ho applicato un affinamento leggero mantenendo **identica la struttura originale** della dashboard.

Modifiche fatte (solo stile, zero logica):

- `components/dashboard/KPICards.tsx`
  - pannelli uniformati con bordo meno duro (`border-slate-600/70`)
  - micro-riduzione spaziatura top (`mb-2.5`)
  - valore KPI leggermente più leggibile (`text-[1.7rem]` + `leading-tight`)
- `components/dashboard/PipelineChart.tsx`
  - padding da `p-6` a `p-5`
  - header più compatto (`mb-4`)
  - bordo armonizzato
- `components/dashboard/DepartmentWorkloadChart.tsx`
  - stessi affinamenti di Pipeline (`p-5`, `mb-4`, bordo armonizzato)
- `components/dashboard/AggregatedKanbanStatus.tsx`
  - header più compatto (`mb-4`)
  - griglia interna più densa (`gap-3`)
  - card interne con bordo più soft e padding ottimizzato
- `components/dashboard/LatestNotifications.tsx`
  - stesso trattamento visuale dei pannelli (`p-5`, `mb-4`, bordi coerenti)
  - pulizia di una variabile non usata (`daysLate`) nel formatter

Verifiche:

- lint pulito su tutti i file toccati.
- nessuna modifica a data binding, query o business logic.

Se vuoi, nel prossimo passo faccio un **A/B rapidissimo** su 2 varianti (solo `p-5` vs `p-6`) per scegliere quella visivamente migliore al tuo occhio.

---

**User**

procedi

---

**Cursor**

Procedo con la variante B (più ariosa): mantengo tutte le ottimizzazioni ma riporto il respiro pannelli a `p-6`/header `mb-6` per verificare una resa più bilanciata su desktop.

Proceduto. Ho applicato la variante più ariosa mantenendo layout e logica invariati.

### Aggiornato
- `PipelineChart`, `DepartmentWorkloadChart`, `AggregatedKanbanStatus`, `LatestNotifications`
  - pannelli con `p-6` + header `mb-6` (respiro desktop)
  - bordi più morbidi/coerenti (`border-slate-600/70`)
  - card interne (kanban/notifiche) con bordi meno aggressivi (`border-slate-700/70`)
  - densità interna leggermente ottimizzata nel Kanban (`gap-3`, `p-3.5`)

### Verifica
- Nessun errore lint.

Se vuoi, al prossimo step faccio un ultimo micro-tuning solo su **KPI cards** (titolo/valore/spazio delta) per allinearle perfettamente al nuovo respiro dei pannelli.

---

**User**

ora ottimizza tutte le dashboard, unificando colori, dimensioni container, font, ecc...

---

**Cursor**

Perfetto, procedo direttamente: definisco uno standard condiviso (token visuali + wrapper riutilizzabili) e lo applico alle dashboard `Overview`, `Vendita` e `AVOR` senza toccare la logica dati. Inizio mappando i componenti interessati.

Adesso applico la normalizzazione trasversale: unifico i colori dei container dashboard su tutti i componenti (stesso bordo/panel tone) e allineo il ritmo verticale delle pagine dove era diverso.

Fatto: ho applicato una normalizzazione **cross-dashboard** su tutte le dashboard (Overview, Vendita, AVOR, Produzione, Fatturazione, Interni, Inventario, Prodotti, Forecast), mantenendo invariata la logica.

### Cosa ho unificato

- **Colore/tono container pannelli**
  - sostituito ovunque il bordo `border-white/20 dark:border-white/10`
  - nuovo standard unico: `border-slate-600/70`
  - applicato su tutti i componenti in `components/dashboard/**`

- **Linguaggio visivo pannelli**
  - mantenuti in modo coerente:
    - `backdrop-blur-xl`
    - `bg-white/10 dark:bg-black/10`
    - `rounded-2xl`
    - `shadow-xl`
  - così i pannelli hanno ora lo stesso “peso” visivo su tutte le dashboard

- **Ritmo verticale pagine**
  - allineato il contenitore principale di `Prodotti` da `space-y-8` a `space-y-6` per coerenza con le altre dashboard

### Verifica

- Nessun errore lint sui file toccati.
- Nessun cambiamento a query, binding o business logic.

Se vuoi, nel prossimo passaggio faccio il **secondo layer di unificazione** (tipografia titoli pannello, dimensione KPI value, spacing header pannello) con token unici condivisi, così chiudiamo anche `font` e `dimensioni` in modo sistematico.

---

**User**

procedi!

---

**Cursor**

Procedo con il secondo layer “sistemico”: introduco classi utility globali dashboard (panel, header-title/subtitle, inner-card) e faccio un refactor massivo dei componenti per usare uno standard unico invece di classi duplicate.

Ho applicato la standardizzazione con utility classes condivise su 40 componenti dashboard. Ora faccio un pass di sicurezza per intercettare sostituzioni troppo aggressive e correggere eventuali regressioni.

Ho esteso anche il max-width coerente (`1600px`) a tutte le pagine dashboard. Faccio un controllo finale su lint + diff per verificare che la standardizzazione sia pulita e solo visuale.

Completato: ho fatto la normalizzazione estesa di **tutte le dashboard** (non solo Overview), mantenendo invariata la logica dati.

### Cosa ho unificato

- **Token visuali globali dashboard** in `app/globals.css`:
  - `.dashboard-panel`
  - `.dashboard-panel-inner`
  - `.dashboard-panel-title`
  - `.dashboard-panel-subtitle`

- **Container e colori pannelli** in `components/dashboard/**`:
  - sostituiti i blocchi classi duplicati con i token comuni
  - bordo uniforme su tutti i pannelli (`slate-600/70`) e inner card coerenti

- **Tipografia pannelli**:
  - titoli pannello standardizzati con `.dashboard-panel-title`
  - sottotitoli/testi secondari standardizzati con `.dashboard-panel-subtitle`

- **Dimensione contenitore pagina dashboard**:
  - su tutte le pagine in `app/sites/[domain]/dashboard/**/page.tsx`
  - `PageContent` ora usa: `max-w-[1600px] w-full mx-auto`
  - applicato a: Overview, Forecast, Vendita, AVOR, Produzione, Fatturazione, Interni, Inventario, Prodotti

### Verifica

- Nessun errore lint.
- Refactor solo visuale/stilistico: nessun cambiamento a query, binding o business rules.

Se vuoi, nel prossimo passaggio faccio il **layer finale**: standardizzare anche le altezze header pannello e la scala tipografica KPI (value/label/delta) con 2-3 size token fissi, così chiudiamo al 100% la coerenza visiva.

