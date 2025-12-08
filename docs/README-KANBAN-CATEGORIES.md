# Kanban Categories - Documentazione

## Panoramica

Il sistema di categorie Kanban permette di organizzare le board Kanban in gruppi dinamici e personalizzabili per ogni tenant (site). Questa funzionalità sostituisce la categorizzazione statica hardcoded (Ufficio/Produzione) con un sistema flessibile gestibile dal database.

## Caratteristiche

- ✅ **Multi-tenant**: Ogni site può avere le proprie categorie personalizzate
- ✅ **Dinamico**: Crea, modifica ed elimina categorie senza modificare il codice
- ✅ **Flessibile**: Personalizza nome, descrizione, icona, colore e ordine
- ✅ **Scalabile**: Supporta un numero illimitato di categorie
- ✅ **Backward Compatible**: Le kanban esistenti possono rimanere senza categoria

## Struttura Database

### Tabella `KanbanCategory`

```sql
CREATE TABLE "KanbanCategory" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  identifier VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, identifier)
);
```

### Modifiche alla Tabella `Kanban`

```sql
ALTER TABLE "Kanban" 
ADD COLUMN category_id INTEGER REFERENCES "KanbanCategory"(id) ON DELETE SET NULL;
```

## Componenti Principali

### 1. KanbanCategoryManager
**Path**: `components/kanbans/KanbanCategoryManager.tsx`

Componente completo per la gestione delle categorie. Permette di:
- Visualizzare tutte le categorie
- Creare nuove categorie
- Modificare categorie esistenti
- Eliminare categorie (con controllo se sono in uso)

**Utilizzo**:
```tsx
<KanbanCategoryManager 
  domain={domain} 
  onCategoryChange={() => {
    // Callback opzionale dopo modifiche
  }} 
/>
```

### 2. KanbanCategorySelector
**Path**: `components/kanbans/KanbanCategorySelector.tsx`

Selettore dropdown per scegliere una categoria quando si crea/modifica una kanban.

**Utilizzo**:
```tsx
<KanbanCategorySelector
  domain={domain}
  value={categoryId}
  onChange={(id) => setCategoryId(id)}
  disabled={false}
/>
```

## Actions Server

### get-kanban-categories.action.ts
Recupera tutte le categorie per un determinato site.

```typescript
const categories = await getKanbanCategories(domain);
```

### save-kanban-category.action.ts
Crea o aggiorna una categoria.

```typescript
const result = await saveKanbanCategory({
  name: "Ufficio",
  identifier: "ufficio",
  description: "Kanban per l'ufficio",
  color: "#3B82F6",
  display_order: 0
}, domain);
```

### delete-kanban-category.action.ts
Elimina una categoria (solo se non è utilizzata da nessuna kanban).

```typescript
const result = await deleteKanbanCategory(categoryId, domain);
```

## API Endpoints

### GET /api/kanban/categories
Recupera le categorie per un site.

**Query Parameters**:
- `domain`: Il dominio del site

**Response**:
```json
[
  {
    "id": 1,
    "name": "Ufficio",
    "identifier": "ufficio",
    "description": "Kanban per attività d'ufficio",
    "icon": "Briefcase",
    "color": "#3B82F6",
    "display_order": 0,
    "site_id": "uuid-here",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

## Sidebar Integration

La sidebar è stata aggiornata per mostrare dinamicamente le categorie:

- Se **non ci sono categorie**: mostra tutte le kanban in un unico elenco
- Se **ci sono categorie**: raggruppa le kanban per categoria
- **Kanban senza categoria**: vengono mostrate sotto "Senza Categoria"

Le categorie vengono caricate automaticamente con React Query per ottimizzare le performance.

## Pagina di Gestione

**Path**: `/sites/[domain]/kanban-categories`

Pagina dedicata per la gestione delle categorie, accessibile solo ai **superadmin**.

**Funzionalità**:
- Vista card di tutte le categorie
- Creazione rapida di nuove categorie
- Modifica inline delle categorie esistenti
- Eliminazione con conferma

## Script di Seed

### seed-kanban-categories.ts
Script per inizializzare le categorie di default per i site esistenti.

**Esecuzione**:
```bash
bun run scripts/seed-kanban-categories.ts
```

**Cosa fa lo script**:
1. Trova tutti i site nel database
2. Per ogni site che non ha categorie, crea due categorie di default:
   - **Ufficio** (blu)
   - **Produzione** (arancione)
3. Tenta di assegnare automaticamente le kanban esistenti alle categorie basandosi sul nome

## Store Zustand

Il store è stato aggiornato per supportare le categorie:

```typescript
interface KanbanStore {
  kanbans: Kanban[];
  categories: KanbanCategory[];
  selectedCategoryId: number | null;
  setKanbans: (kanbans: Kanban[]) => void;
  setCategories: (categories: KanbanCategory[]) => void;
  setSelectedCategoryId: (categoryId: number | null) => void;
}
```

## Flusso di Creazione Kanban

1. L'utente apre il modal di creazione kanban
2. Compila i campi: titolo, identificatore, colore
3. **Seleziona una categoria** dal dropdown (opzionale)
4. Aggiunge le colonne
5. Salva la kanban con `category_id` incluso

## Migration

Se hai già un database esistente, esegui:

1. Crea la tabella `KanbanCategory` (vedi SQL sopra)
2. Aggiungi il campo `category_id` alla tabella `Kanban`
3. Esegui lo script di seed per creare le categorie di default
4. Aggiorna i types TypeScript: `bun run supabase gen types typescript --project-id [PROJECT_ID] > types/database.types.ts`

## Best Practices

1. **Identificatori Univoci**: Usa identificatori lowercase e snake_case (es: `ufficio`, `produzione_principale`)
2. **Colori Distintivi**: Scegli colori diversi per ogni categoria per facilitare il riconoscimento visivo
3. **Ordine Logico**: Usa `display_order` per controllare l'ordine di visualizzazione
4. **Eliminazione Sicura**: Il sistema previene l'eliminazione di categorie in uso
5. **Descrizioni Chiare**: Aggiungi descrizioni per aiutare gli utenti a capire quando usare ogni categoria

## Troubleshooting

### Le categorie non appaiono nella sidebar
- Verifica che il fetch API funzioni correttamente
- Controlla la console per errori React Query
- Assicurati che il `site_id` sia corretto

### Errore durante l'eliminazione di una categoria
- Verifica che la categoria non sia assegnata a nessuna kanban
- Riassegna le kanban ad altre categorie prima di eliminare

### Le kanban esistenti non hanno categoria
- Esegui lo script di seed
- Oppure assegna manualmente le categorie modificando ogni kanban

## Roadmap Futuri Miglioramenti

- [ ] Drag & drop per riordinare categorie
- [ ] Icone personalizzate (upload immagini)
- [ ] Permessi granulari per categoria
- [ ] Statistiche per categoria
- [ ] Esportazione/Importazione configurazioni categorie
- [ ] Template di categorie predefinite

## Supporto

Per domande o problemi, contatta il team di sviluppo o apri un issue su GitHub.

