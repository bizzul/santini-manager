# Piano di implementazione – Ottimizzazioni calendari

Documento di pianificazione per le migliorie ai calendari Produzione, Posa e Service.

---

## Riepilogo richieste

| # | Richiesta | Calendari interessati | Complessità |
|---|-----------|------------------------|-------------|
| 1 | Colori e icone per tipo prodotto | Produzione | Media |
| 2 | Riepilogo elementi per categoria (settimana/mese) | Tutti | Media |
| 3 | Visualizzazione orari 06:00–20:00 | Posa, Service | Alta |
| 4 | 2 colonne per giorno (Squadra 1, Squadra 2) | Posa, Service | Alta |
| 5 | Tooltip info progetto al passaggio del mouse | Tutti | Bassa |
| 6 | Click su appuntamento → apertura progetto | Tutti | Bassa |

---

## Fase 1: Quick wins (priorità alta, bassa complessità)

### 1.1 Tooltip al passaggio del mouse (richiesta 5)

**Obiettivo:** Mostrare una card con info del progetto al passaggio del mouse sull’appuntamento.

**File coinvolti:**
- `components/calendar/calendarComponent.tsx`
- `components/ui/hover-card.tsx` (già presente)

**Implementazione:**
- Avvolgere ogni evento in un `HoverCard` di Radix
- Contenuto: codice progetto, cliente, luogo, tipo prodotto, data consegna
- Usare `eventDidMount` o `eventContent` di FullCalendar per iniettare il wrapper

**Stima:** 2–3 ore

---

### 1.2 Click su appuntamento → apertura progetto (richiesta 6)

**Obiettivo:** Clic sull’appuntamento apre la pagina/dialog del progetto.

**File coinvolti:**
- `components/calendar/calendarComponent.tsx`
- `app/sites/[domain]/progetti/[id]/page.tsx` (pagina esistente)

**Implementazione:**
- Aggiungere `eventClick` a FullCalendar
- Da `event.extendedProps` recuperare `taskId`
- Navigare con `router.push(\`/sites/${domain}/progetti/${taskId}\`)` o aprire dialog
- Passare `domain` al `CalendarComponent` (props o `usePathname`)

**Stima:** 1–2 ore

---

## Fase 2: Colori e icone per tipo prodotto (richiesta 1)

**Obiettivo:** Come nel Kanban Posa, colorare gli eventi in base alla categoria prodotto (SellProduct → category).

**Riferimento:** `components/kanbans/Card.tsx` (righe 278–335)
- `show_category_colors` su Kanban
- `productCategory` da `sellProduct.category`
- `CATEGORY_ICONS` (arredamento, porte, serramenti, accessori)
- `getDerivedColors(productCategory?.color)`

**File coinvolti:**
- `components/calendar/calendarComponent.tsx`
- `app/sites/[domain]/calendar/page.tsx` (e possibilmente Posa/Service)
- `components/kanbans/Card.tsx` (logica da riusare)

**Implementazione:**
1. **Data fetching:** Includere `sellProduct:SellProduct(category:sellproduct_categories(id,name,color))` nella query Task per tutti i calendari.
2. **Estrazione logica:** Creare `lib/calendar-product-styling.ts` con:
   - `getEventStyleFromProduct(task)` → `{ backgroundColor, borderColor, textColor }`
   - `getProductCategoryIcon(categoryName)` → LucideIcon
3. **CalendarComponent:** Usare questi stili in `events` e mostrare icona in `eventContent`.
4. **Produzione:** Abilitare per default (o leggere `show_category_colors` dalla kanban di produzione).
5. **Posa/Service:** Stessa logica se le task hanno `sellProduct`.

**Stima:** 4–6 ore

---

## Fase 3: Riepilogo nella barra superiore (richiesta 2)

**Obiettivo:** Mostrare nella barra superiore il numero di elementi per categoria nella settimana e nel mese correnti.

**File coinvolti:**
- `components/calendar/calendarComponent.tsx`
- Nuovo: `components/calendar/CalendarSummaryBar.tsx`

**Implementazione:**
1. **Calcolo:** Da `filteredTasks` e dalla vista corrente (date range) calcolare:
   - elementi per categoria (es. Arredamento: 3, Porte: 2)
   - totali settimana corrente e mese corrente
2. **UI:** Barra sopra il calendario con badge o pill per categoria (colore + numero).
3. **Aggiornamento:** Usare `datesSet` per avere il range visibile e ricalcolare.
4. **Categorie:** Usare `sellProduct.category.name` o fallback "Senza categoria".

**Layout suggerito:**
```
[←] [Oggi] [→]     |  Settimana: Arredamento 2 | Porte 1 | Serramenti 3  |  Mese: Arredamento 8 | Porte 5 | ...
```

**Stima:** 3–4 ore

---

## Fase 4: Orari e colonne squadre (richieste 3 e 4)

**Obiettivo:**
- Posa e Service: vista con orari 06:00–20:00
- 2 colonne per giorno: Squadra 1 e Squadra 2

**Dipendenze:**
- Nuovi campi DB per Task: `ora_inizio`, `ora_fine`, `squadra` (1 o 2)

### 4.1 Migrazione database

**File:** `supabase/migrations/YYYYMMDD_add_task_time_and_team.sql`

```sql
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ora_inizio" TIME;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ora_fine" TIME;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "squadra" INTEGER CHECK (squadra IN (1, 2));
```

**Note:**
- `ora_inizio`/`ora_fine` usati solo per Posa e Service
- `squadra` 1 o 2; se null, assegnare default (es. 1) o mostrare in colonna “Non assegnato”

**Stima:** 1 ora (+ test)

---

### 4.2 Form modifica task

**File:** `components/kanbans/editKanbanTask.tsx`, form progetto

Aggiungere campi (visibili solo per kanban Posa/Service):
- Ora inizio (TimePicker 06:00–20:00)
- Ora fine (TimePicker 06:00–20:00)
- Squadra (select: Squadra 1, Squadra 2)

**Stima:** 2–3 ore

---

### 4.3 FullCalendar: timeGrid e resource

**Dipendenze da installare:**
```bash
npm install @fullcalendar/timegrid @fullcalendar/resource-timeline
```

**File:** `components/calendar/calendarComponent.tsx`

1. **Vista condizionale:**
   - Produzione: `dayGridMonth` (come ora)
   - Posa, Service: `resourceTimeGridDay` o `resourceTimelineDay`

2. **Risorse:** Per ogni giorno, 2 risorse: "Squadra 1", "Squadra 2".

3. **Eventi con orario:**
   - `start`: `deliveryDate` + `ora_inizio` (default 08:00 se null)
   - `end`: `deliveryDate` + `ora_fine` (default 12:00 se null)
   - `resourceId`: "squadra-1" o "squadra-2"

4. **Slot orari:** `slotMinTime: "06:00"`, `slotMaxTime: "20:00"`.

**Complessità:** Resource Timeline di FullCalendar richiede configurazione specifica. Alternativa più semplice: vista `timeGridWeek` con due “sub-columns” per giorno ottenute via CSS o custom rendering.

**Alternativa semplificata:** 
- Usare `timeGridDay` con eventi che hanno `start`/`end` con orario
- Per le 2 squadre: due “resource” fittizie o due calendari affiancati (Squadra 1 | Squadra 2) nella stessa giornata

**Stima:** 8–12 ore (dipende da scelta resource vs custom)

---

## Ordine di implementazione consigliato

| Ordine | Fase | Descrizione | Stato |
|--------|------|-------------|-------|
| 1 | 1.1 | Tooltip al passaggio del mouse | ✅ Fatto |
| 2 | 1.2 | Click → apertura progetto | ✅ Fatto |
| 3 | 2 | Colori e icone per tipo prodotto | ✅ Fatto |
| 4 | 3 | Riepilogo barra superiore | ✅ Fatto |
| 5 | 4.1 | Migrazione DB ora/squadra | ✅ Fatto |
| 6 | 4.2 | Form modifica task | ✅ Fatto |
| 7 | 4.3 | Vista orari e colonne squadre | ✅ Fatto |

---

## Riepilogo stime

| Fase | Ore stimate |
|------|-------------|
| Fase 1 (tooltip + click) | 3–5 |
| Fase 2 (colori/icone) | 4–6 |
| Fase 3 (riepilogo) | 3–4 |
| Fase 4 (orari + squadre) | 11–16 |
| **Totale** | **21–31 ore** |

---

## Note tecniche

### FullCalendar – plugin disponibili
- `@fullcalendar/daygrid` – già in uso
- `@fullcalendar/timegrid` – per vista oraria
- `@fullcalendar/resource-timeline` – per risorse (squadre)

### Categorie prodotto
- Tabella: `sellproduct_categories` (name, color)
- Relazione: Task → SellProduct → sellproduct_categories
- Icone: `components/kanbans/Card.tsx` → `CATEGORY_ICONS`

### Navigazione progetto
- Pagina: `app/sites/[domain]/progetti/[id]/page.tsx`
- Route: `/sites/[domain]/progetti/[taskId]`
