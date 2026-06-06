# Standard layout tabelle

Guida alla standardizzazione delle larghezze colonne nel manager Santini.

## Infrastruttura

| File | Ruolo |
|------|-------|
| [`lib/table-layout-presets.ts`](../lib/table-layout-presets.ts) | Ruoli colonna, token di larghezza, preset |
| [`components/table/table-colgroup.tsx`](../components/table/table-colgroup.tsx) | Helper `<colgroup>` per `table-fixed` |

### Ruoli colonna

| Ruolo | Comportamento |
|-------|---------------|
| `leading` | Fissa — espansione + thumbnail (5.5rem) |
| `code` | Fissa — codici brevi (3.5rem) |
| `name` | Fissa — nome entità, troncato (7rem) |
| `descriptionFlex` | **Flessibile** — occupa lo spazio residuo, testo su più righe |
| `metric` | Fissa — contatori (3rem) |
| `metricWide` | Fissa — quantità con unità (4rem) |
| `currency` | Fissa — importi CHF |
| `actions` | Fissa — pulsanti riga (5.5rem) |
| `actionsCompact` | Fissa — icona azione (3rem) |
| `textFixed` | Fissa — testo secondario con truncate |
| `dimension` | Fissa — colonne dimensioni (3.25rem) |

Le tabelle dense usano padding ridotto (`px-2 py-2`) sovrascrivendo il default `p-4` di `components/ui/table.tsx` **solo** nelle celle interessate.

## Tipologie di visualizzazione

### HierarchySummary

Tabella gerarchica browse (categorie → sottocategorie → righe figlie).

- `table-fixed` + `<colgroup>`
- Colonne fisse: leading, code/name, metriche, valore, azioni
- Colonna flex: `descriptionFlex`
- Header abbreviati: Art., S.cat, Pz.

**Preset:** `hierarchySummary` (Magazzino), `sellHierarchySummary` (Prodotti in vendita)

### ArticlesDense

Tabella articoli/prodotti compatta con molte colonne (drill-down o vista compact).

- `table-fixed` + `<colgroup>`
- Colonna flex: `name` (wrap)
- Dimensioni, quantità e prezzi a larghezza fissa
- Header quantità: **Pz.**

**Preset:** `inventoryArticlesDense`, `inventoryArticlesCompact`, `sellProductsDense`

### AdminCRUD

Liste amministrative con selezione, ordinamento e azioni.

- Padding standard (`px-4`)
- Layout auto o resize manuale
- Una colonna testuale principale può essere resa flex in rollout futuro

### TrackingWide

Tabelle operative larghe (timbrature, errori).

- `table-fixed` dove già presente
- Date/durate fisse, note/descrizione flessibile

### SimpleList

Liste semplici (poche colonne).

- Codice e azioni fissi, nome/descrizione flessibile o wrap

## Stato implementazione

| Modulo | File tabella | Tipologia | Stato |
|--------|--------------|-----------|-------|
| Magazzino gerarchico | `components/categories/inventory-hierarchical-browse-table.tsx` | HierarchySummary | **Completato** |
| Magazzino articoli | `app/sites/[domain]/inventory/table.tsx` | ArticlesDense | **Completato** (compact + categoryDrilldown) |
| Prodotti gerarchico | `components/sell-categories/sell-product-hierarchical-browse-table.tsx` | HierarchySummary | **Completato** |
| Prodotti drill-down | `app/sites/[domain]/products/table.tsx` | ArticlesDense | **Completato** (embedded categoryDrilldown) |
| Categorie inventario admin | `app/sites/[domain]/categories/table.tsx` | AdminCRUD | Da fare |
| Categorie prodotti admin | `app/sites/[domain]/product-categories/table.tsx` | AdminCRUD | Da fare |
| Clienti | `app/sites/[domain]/clients/table.tsx` | AdminCRUD | Da fare |
| Fornitori | `app/sites/[domain]/suppliers/table.tsx` | AdminCRUD | Da fare |
| Produttori | `app/sites/[domain]/manufacturers/table.tsx` | AdminCRUD | Da fare |
| Collaboratori | `app/sites/[domain]/collaborators/table.tsx` | AdminCRUD | Da fare |
| Progetti | `app/sites/[domain]/projects/table.tsx` | AdminCRUD | Da fare |
| Timbrature | `app/sites/[domain]/timetracking/table.tsx` | TrackingWide | Da fare (già `table-fixed`) |
| Errori | `app/sites/[domain]/errortracking/table.tsx` | TrackingWide | Da fare |
| Controllo qualità | `app/sites/[domain]/qualityControl/table.tsx` | AdminCRUD | Da fare |
| Imballaggio | `app/sites/[domain]/boxing/table.tsx` | SimpleList | Da fare |
| Cat. fornitori | `app/sites/[domain]/supplier-categories/table.tsx` | SimpleList | Da fare |
| Cat. produttori | `app/sites/[domain]/manufacturer-categories/table.tsx` | SimpleList | Da fare |

## Come applicare un preset a una nuova tabella

1. Assegnare una tipologia dalla tabella sopra.
2. Importare da `lib/table-layout-presets.ts`:
   - `getTableCellClasses` / `getTableHeadClasses` per tabelle manuali
   - `getInventoryArticlesCellClassName` o `getSellProductsCellClassName` per DataTable TanStack
3. Aggiungere `className="w-full table-fixed"` sulla `<Table>`.
4. Inserire `<TableColGroup columns={...} />` prima di `<TableHeader>`.
5. Avvolgere in `overflow-x-auto` per viewport stretti.

## Criteri di accettazione

- Colonne identità/metrica non si dilatano su viewport larghe
- Almeno una colonna testuale assorbe lo spazio residuo (wrap, non truncate) dove previsto dal preset
- Header abbreviati coerenti tra viste correlate (Art., S.cat, Pz.)
- Nessuna rimozione di colonne o contenuto

## Rollout prioritario (prossimi interventi)

1. **AdminCRUD** — `categories/table.tsx`, `product-categories/table.tsx`
2. **Anagrafiche** — clients, suppliers, manufacturers, collaborators
3. **Operativo** — projects, timetracking, errortracking, qualityControl, boxing
