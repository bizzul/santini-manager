# ApexCharts Components

Questa cartella contiene componenti ApexCharts riutilizzabili e animati per i grafici della dashboard.

## Componenti Disponibili

### 1. ApexBarChart
Grafico a barre animato con supporto per orientamento orizzontale e verticale.

**Props:**
- `categories: string[]` - Etichette per l'asse X
- `series: { name: string; data: number[]; color?: string; }[]` - Dati delle serie
- `height?: number` - Altezza del grafico (default: 350)
- `horizontal?: boolean` - Orientamento orizzontale (default: false)
- `stacked?: boolean` - Barre impilate (default: false)
- `dataLabels?: boolean` - Mostra etichette dati (default: true)
- `theme?: "light" | "dark"` - Tema del grafico (default: "dark")
- `gradient?: boolean` - Usa gradiente (default: true)

**Esempio:**
```tsx
import ApexBarChart from "@/components/charts/ApexBarChart";

<ApexBarChart
  categories={["Gen", "Feb", "Mar"]}
  series={[
    { name: "Vendite", data: [100, 200, 150], color: "#3b82f6" },
    { name: "Costi", data: [80, 120, 100], color: "#ef4444" }
  ]}
  height={400}
/>
```

### 2. ApexColumnChart
Grafico a colonne verticali con animazioni fluide.

**Props:**
- `categories: string[]` - Etichette per l'asse X
- `series: { name: string; data: number[]; color?: string; }[]` - Dati delle serie
- `height?: number` - Altezza del grafico (default: 300)
- `theme?: "light" | "dark"` - Tema del grafico (default: "dark")
- `gradient?: boolean` - Usa gradiente (default: true)
- `showGrid?: boolean` - Mostra griglia (default: true)

**Esempio:**
```tsx
import ApexColumnChart from "@/components/charts/ApexColumnChart";

<ApexColumnChart
  categories={["Prodotto A", "Prodotto B", "Prodotto C"]}
  series={[
    { name: "Quantità", data: [45, 32, 67], color: "#22c55e" }
  ]}
  height={300}
/>
```

### 3. ApexRadialBar
Grafico radiale circolare per visualizzare percentuali.

**Props:**
- `value: number` - Valore percentuale (0-100)
- `label: string` - Etichetta del grafico
- `color?: string` - Colore del grafico (default: "#3b82f6")
- `height?: number` - Altezza del grafico (default: 250)
- `theme?: "light" | "dark"` - Tema del grafico (default: "dark")

**Esempio:**
```tsx
import ApexRadialBar from "@/components/charts/ApexRadialBar";

<ApexRadialBar
  value={75}
  label="Completamento"
  color="#22c55e"
  height={250}
/>
```

## Caratteristiche

✅ **Animazioni fluide** - Tutte le animazioni sono ottimizzate per prestazioni eccellenti
✅ **Responsive** - I grafici si adattano automaticamente alle dimensioni del contenitore
✅ **Temi Dark/Light** - Supporto completo per temi chiari e scuri
✅ **Gradienti** - Effetti gradiente personalizzabili
✅ **SSR Safe** - Caricamento dinamico per compatibilità con Next.js
✅ **TypeScript** - Completamente tipizzato con TypeScript

## Utilizzo nei Dashboard Components

I componenti ApexCharts sono già integrati nei seguenti componenti della dashboard:

- `ProductionOrdersCard.tsx` - Grafico a barre per ordini di produzione
- `OffersCard.tsx` - Grafico a colonne per offerte
- `OffersChartCard.tsx` - Grafico verticale per offerte per reparto
- `dashboard.tsx` - Multipli grafici animati per dati di produzione

## Note Tecniche

- I grafici usano `dynamic import` per evitare problemi con SSR in Next.js
- Le animazioni sono configurate per essere fluide ma non troppo lente (800-1200ms)
- I colori di default seguono la palette Tailwind CSS
- Il tema dark usa colori ottimizzati per il contrasto con lo sfondo della dashboard

