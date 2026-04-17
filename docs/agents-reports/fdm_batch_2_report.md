# Batch 2 Report - Dashboard & Report

## Sintesi esecutiva

Le chat sulla **Overview dashboard** descrivono un layout desktop-first a zone fisse (`DashboardOverviewShell`, griglia 12 colonne, altezze 48/56/120/280/232 px) e componenti aggiornati (`DashboardTabs` con `compact`, ecc.). Nel repo attuale la pagina Overview (`app/sites/[domain]/dashboard/page.tsx`) usa ancora **`PageLayout` + `PageHeader` + `PageContent`**, griglia fluida e **mappa progetti** affiancata ai grafici: **non risulta implementato** il refactor citato.  
Le aree **Produzione** (grafico tipologie stile AVOR, rimozione carico reparto) e **Report** (`GridReports`, `fetchReportsData`, API progetti) mostrano invece **implementazione allineata** alle rispettive chat.  
Per i **numeri dashboard produzione**, nel codice sono presenti **normalizzazione relazioni Supabase** e aggregazione coerente per il grafico per famiglia prodotto; resta la distanza concettuale tra metriche **per reparto (kanban)** nelle card e **per categoria prodotto** nel grafico.

---

## Chat-per-chat

### 1) `cursor_cambiamento_dashboard_overview.md`

**Richiesta:** Spiegazione del perché la dashboard Overview “è cambiata”; risposta che descrive refactor a layout rigido (tab 48px, KPI 120px, chart 280px, bottom 232px, `max-width` 1600px, griglia 12 colonne, ecc.).

**Evidenze codice:**
- Overview attuale: `PageLayout` / `PageContent`, `space-y-6`, mappa + grafici — niente zone a altezza fissa né `DashboardGridLayout` / `DashboardOverviewShell`.  
  ```72:104:/Users/matteopaolocci/santini-manager/app/sites/[domain]/dashboard/page.tsx
  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
  ...
      <PageContent>
        <div className="space-y-6">
          <KPICards data={dashboardData} />
          <div className="grid gap-4 md:grid-cols-2">
  ...
  ```
- `KPICards` usa griglia responsiva `md:grid-cols-2 lg:grid-cols-4`, non 4 colonne fisse da overview “rigida”.  
  ```68:74:/Users/matteopaolocci/santini-manager/components/dashboard/KPICards.tsx
  export default function KPICards({ data }: KPICardsProps) {
    const panelClassName =
      "dashboard-panel p-5 relative overflow-hidden";

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  ```
- `PipelineChart` ha ancora `height: 300` nel chart Apex, non il pannello 280px del thread.  
  ```25:30:/Users/matteopaolocci/santini-manager/components/dashboard/PipelineChart.tsx
  export default function PipelineChart({ data }: DashboardStats) {
    const chartOptions: ApexOptions = {
      chart: {
        type: "area",
        height: 300,
  ```
- Nessun file `DashboardGridLayout.tsx` / `DashboardOverviewLayout.tsx` sotto `components/dashboard/` (solo riferimenti in `docs/chat-exports/`).

**Stato:** **MANCANTE** (il layout descritto nella spiegazione **non corrisponde** al codice attuale della Overview).

**Azioni residue:** Decidere se il refactor va ancora portato in branch principale; allineare documentazione interna allo stato reale della Overview.

**Numeri / Supabase:** non applicabile a questa chat (solo layout).

---

### 2) `cursor_fdm_overview_dashboard_layout_re.md`

**Richiesta:** Refactor **solo Overview**: `DashboardOverviewShell`, 5 zone, anti-scroll, KPI/chart/bottom standardizzati, `DashboardTabs` `compact`, notifiche max 4–5, componente riusabile `DashboardOverviewLayout.tsx`, ecc.

**Evidenze codice:**
- Stessi punti della chat 1: pagina Overview senza shell dedicata (vedi citazione `page.tsx` sopra).
- `DashboardTabs`: nessuna prop `compact`; header ancora `sticky` con padding classico.  
  ```25:78:/Users/matteopaolocci/santini-manager/components/dashboard/DashboardTabs.tsx
  export default function DashboardTabs() {
  ...
    return (
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-4 px-4 py-3 md:px-6 lg:px-8">
  ```
- `AggregatedKanbanStatus` non è montato sulla Overview (solo es. `forecast`).  
  ```11:96:/Users/matteopaolocci/santini-manager/app/sites/[domain]/dashboard/forecast/page.tsx
  import AggregatedKanbanStatus from "@/components/dashboard/AggregatedKanbanStatus";
  ...
            <AggregatedKanbanStatus data={dashboardData} />
  ```

**Stato:** **MANCANTE**.

**Azioni residue:** Implementare o ripristinare `DashboardOverviewShell` (o equivalente) e aggiornare `page.tsx` Overview; oppure chiudere formalmente il backlog se la direzione è restare sul layout con mappa.

**Numeri / Supabase:** invariati (solo UI).

---

### 3) `cursor_inconsistenza_numeri_dashboard_p.md`

**Richiesta:** In dashboard Produzione le card in alto sono corrette ma i numeri nel grafico no; ipotesi categoria prodotto non normalizzata (Supabase array) e disallineamento aggregazione.

**Evidenze codice:**
- Helper centralizzati per relazioni `category` e label colore:  
  ```1:28:/Users/matteopaolocci/santini-manager/lib/product-category-label.ts
  /**
   * Helper centralizzati per gestire in modo uniforme la relazione
   * "category" su oggetti provenienti da Supabase.
   ...
   */
  export function normalizeSupabaseRelation<T>(
  ```
- In `fetchProduzioneDashboardData`, loop task produzione: uso di `getProductCategoryLabelAndColor` e `normalizeSupabaseRelation` su `SellProduct.category` prima di aggiornare `productWorkloadMap`.  
  ```4096:4119:/Users/matteopaolocci/santini-manager/lib/server-data.ts
                      const { label: categoryName, color: resolvedColor } =
                          getProductCategoryLabelAndColor(task, "Senza categoria");
                      const sellProductCategory = normalizeSupabaseRelation(
                          task.SellProduct?.category as any,
                      );
  ...
                      productWorkloadMap.set(categoryName, current);
  ```
- Le **card** “superiori” (`ProduzioneStatusCards`) aggregano **per kanban/reparto** (`lavori`/`elementi` in `kanbanStatus`), il grafico **per famiglia prodotto** (`productWorkload`): dimensioni diverse per design.

**Stato:** **OK** per la parte **normalizzazione / aggregazione grafico**; **PARZIALE** se l’attesa utente era **uguaglianza numerica** tra card reparto e barre per categoria (non garantita senza una definizione comune di metrica).

**Azioni residue:** Validazione su dati reali; eventuale copy/UI che chiarisca “per reparto” vs “per tipologia prodotto”; confronto somme totali (stesso insieme task) se serve audit.

**Attenzione numeri:** join `SellProduct:sellProductId(category:category_id(...))` coerente con uso degli helper; rischio residuo solo se `getProductCategoryLabel` riceve task senza `SellProduct` popolato.

---

### 4) `cursor_grafica_prodotti_dashboard_produ.md`

**Richiesta:** Stesso grafico “prodotti” con grafica come AVOR; dataset per famiglia prodotto; posizionamento; poi rimuovere “Carico per reparto” dalla Produzione.

**Evidenze codice:**
- Pagina Produzione: `ProduzioneProductWorkloadChart` dopo calendario, **nessun** `CaricoRepartoChart`.  
  ```81:103:/Users/matteopaolocci/santini-manager/app/sites/[domain]/dashboard/produzione/page.tsx
        <div className="space-y-6">
          {dashboardData.hasProduzionCategory && dashboardData.kanbanStatus.length > 0 && (
            <ProduzioneStatusCards
  ...
          <ProduzioneCalendarWeeklySummary
  ...
          {dashboardData.hasProduzionCategory && (
            <ProduzioneProductWorkloadChart
              data={dashboardData.productWorkload}
            />
          )}
        </div>
  ```
- `ProduzioneProductWorkloadChart` struttura allineata a `AvorWorkloadChart` (stesso pattern barre doppie, `globalMax`, `dashboard-panel`).  
  ```19:33:/Users/matteopaolocci/santini-manager/components/dashboard/produzione/ProduzioneProductWorkloadChart.tsx
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
  ...
          <h3 className="text-lg font-bold">Carico per tipologia prodotto</h3>
  ```
  ```24:38:/Users/matteopaolocci/santini-manager/components/dashboard/avor/AvorWorkloadChart.tsx
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
  ...
          <h3 className="text-lg font-bold">
            Carico di lavoro per tipologia
          </h3>
  ```
- Aggregazione `productWorkload` in `server-data.ts` (vedi chat 3).

**Stato:** **OK**.

**Azioni residue:** Opzionale — verificare se `CaricoRepartoChart.tsx` è ancora referenziato altrove o è codice morto.

**Numeri:** coerenti con la logica in `fetchProduzioneDashboardData` (stesso blocco task produzione).

---

### 5) `cursor_layout_e_filtri_pagine_report.md`

**Richiesta:** Card report uniformi; 3 card “Report operativi” e 6 “Anagrafiche e consuntivi” (con Errori spostato); inventario con categorie selezionabili; Progetti: Prodotto (categorie) + Area progetto (kanban principale); Ore: collaboratori, anno, mese; Prodotti: Categoria + Sottocategoria; fix tabella prodotti Modifica/Duplica; form creazione prodotto esteso; export backend allineato.

**Evidenze codice:**
- Sezione “Report operativi” con **Inventario**, **Progetti**, **Ore** e filtri descritti (`ReportMultiSelect`, anno con `allowClear={false}`, ecc.).  
  ```838:982:/Users/matteopaolocci/santini-manager/components/reports/GridReports.tsx
      <Section
        title="Report operativi"
  ...
        {isReportEnabled("report-inventory") && (
          <ReportCard
            title="Inventario"
  ...
                <ReportField
                label="Categorie inventario"
  ...
        {isReportEnabled("report-projects") && (
          <ReportCard
            title="Progetti"
  ...
              <ReportField label="Prodotto">
  ...
              <ReportField label="Area progetto">
  ...
        {isReportEnabled("report-time") && (
          <ReportCard
            title="Ore"
  ```
- Sezione “Anagrafiche e consuntivi”: **Errori**, **Prodotti** (Categoria/Sottocategoria), **Consuntivo**, **Report cliente**, **Fornitori**, **Collaboratori** = **6** card nel blocco.  
  ```985:1284:/Users/matteopaolocci/santini-manager/components/reports/GridReports.tsx
      <Section
        title="Anagrafiche e consuntivi"
  ...
        {isReportEnabled("report-errors") && (
          <ReportCard
            title="Errori"
  ...
        <ReportCard
          title="Prodotti"
  ...
        <ReportCard
          title="Consuntivo"
  ...
        <ReportCard
          title="Report cliente"
  ...
        <ReportCard
          title="Fornitori"
  ...
        <ReportCard
          title="Collaboratori"
  ```
- `fetchReportsData`: categorie inventario, task con `SellProduct`, normalizzazione `category` array su `SellProduct`.  
  ```1170:1232:/Users/matteopaolocci/santini-manager/lib/server-data.ts
    supabase
      .from("Task")
      .select(
  ...
                    SellProduct:sellProductId(id, name, type, category:category_id(id, name))
  ...
    sellProducts: (sellProductsResult.data || [])
      .map((product: any) => ({
        ...product,
        category: Array.isArray(product.category)
          ? product.category[0] || undefined
          : product.category,
      }))
  ```
- API export progetti per `category_id` prodotti:  
  ```111:129:/Users/matteopaolocci/santini-manager/app/api/reports/tasks/route.ts
  if (productCategoryIds.length > 0) {
    const { data: sellProducts, error: sellProductsError } = await supabase
      .from("SellProduct")
      .select("id")
      .eq("site_id", siteContext.siteId)
      .in("category_id", productCategoryIds);
  ...
    tasksQuery = tasksQuery.in(
      "sellProductId",
      productIds.length > 0 ? productIds : [-1],
    );
  }
  ```
- Tabella prodotti: `duplicateSellProductAction` e `router.refresh` dopo duplicazione.  
  ```21:74:/Users/matteopaolocci/santini-manager/app/sites/[domain]/products/data-table-row-actions.tsx
  import { duplicateSellProductAction } from "./actions/duplicate-item.action";
  ...
      const response = await duplicateSellProductAction(
        Number(row.id),
        domain,
        row.site_id,
      );
  ...
      router.refresh();
  ```
- Migrazione form prodotto estesa:  
  - file: `/Users/matteopaolocci/santini-manager/supabase/migrations/20260408170000_extend_sellproduct_form_fields.sql`

**Stato:** **OK** (layout report, filtri, export progetti, duplicazione prodotti, migrazione). **PARZIALE** solo se un modulo report è disabilitato a DB: il conteggio visibile delle card dipende da `enabledModules`.

**Azioni residue:** Smoke test export (inventario POST, progetti con filtri, prodotti con categorie); conferma migrazione applicata in ambienti non locali.

**Numeri / Supabase:** filtro progetti tramite `SellProduct.category_id` → `sellProductId`; coerente; attenzione a task senza prodotto (esclusi dal filtro categoria).

---

## Matrice stato

| Chat export | Stato |
|-------------|--------|
| `cursor_cambiamento_dashboard_overview.md` | **MANCANTE** |
| `cursor_fdm_overview_dashboard_layout_re.md` | **MANCANTE** |
| `cursor_inconsistenza_numeri_dashboard_p.md` | **OK** (con nota metriche reparto vs famiglia) |
| `cursor_grafica_prodotti_dashboard_produ.md` | **OK** |
| `cursor_layout_e_filtri_pagine_report.md` | **OK** |

---

## Top 5 migliorie

1. **Allineare codice e aspettative sulla Overview:** o implementare il layout FDM documentato nelle chat, o aggiornare la documentazione se la direzione è “mappa + layout fluido”.  
2. **Chiarire in UI** la differenza tra totali **per kanban** e **per categoria prodotto** sulla dashboard Produzione, per evitare falsi bug.  
3. **Pulizia tecnica:** verificare uso residuo di `CaricoRepartoChart` e percorsi non referenziati.  
4. **Report:** test end-to-end degli export con combinazioni di filtri (soprattutto progetti e prodotti) dopo deploy.  
5. **Accessibilità moduli report:** documentare che `GridReports` nasconde card se `isReportEnabled` è falso (conteggi dinamici).

---

## Rischi/Regressioni

- **Overview:** rispetto alle chat FDM, il repo è in stato **fortemente diverso** (mappa, niente shell a 736px, niente bottom Kanban+notifiche come nel thread). Rischio di confusione tra documentazione chat e prodotto attuale.  
- **Dashboard Produzione:** percezione di “numeri sbagliati” può persistere se si confrontano **slice diverse** (reparto vs famiglia) anche con SQL corretto.  
- **Report:** dipendenza da `getEnabledModuleNames`: se un modulo è off, le “3+6” card non sono tutte visibili.

---

## Dipendenze con audit dati

- **Produzione:** `Task` + `SellProduct` + `category_id`; coerenza assicurata da `getProductCategoryLabelAndColor` / `normalizeSupabaseRelation` nel percorso `productWorkload`.  
- **Report progetti:** `tasks/route.ts` risolve `sellProductId` via `category_id` in `SellProduct` — audit: task senza prodotto non entrano nel filtro per categoria (comportamento atteso da specifica “categoria prodotto”).  
- **Report / `fetchReportsData`:** normalizzazione `SellProduct.category` array per UI opzioni; allineata all’export prodotti e filtri GridReports.  
- **Migrazione `extend_sellproduct_form_fields`:** necessaria per coerenza schema con form/azioni prodotto discussi nella stessa chat thread.

---

*Percorsi assoluti citati:* `/Users/matteopaolocci/santini-manager/app/sites/[domain]/dashboard/page.tsx`, `.../dashboard/produzione/page.tsx`, `.../reports/page.tsx`, `components/dashboard/DashboardTabs.tsx`, `components/dashboard/KPICards.tsx`, `components/dashboard/PipelineChart.tsx`, `components/reports/GridReports.tsx`, `lib/server-data.ts`, `lib/product-category-label.ts`, `app/api/reports/tasks/route.ts`, `app/sites/[domain]/products/data-table-row-actions.tsx`, `components/dashboard/avor/AvorWorkloadChart.tsx`, `components/dashboard/produzione/ProduzioneProductWorkloadChart.tsx`.
