# Test Suite Documentation

Questa directory contiene tutti i test per le azioni dei progetti e delle kanban del sistema Santini Manager.

## Struttura

```
__tests__/
├── setup/
│   └── mocks.ts                    # Utilities e mock per i test
├── projects/
│   ├── create-item.test.ts         # Test per creazione progetti
│   ├── edit-item.test.ts           # Test per modifica progetti
│   ├── delete-item.test.ts         # Test per eliminazione progetti
│   └── archived-item.test.ts       # Test per archiviazione progetti
├── kanban/
│   ├── create-item.test.ts         # Test per creazione task kanban
│   ├── save-kanban.test.ts         # Test per salvataggio kanban
│   ├── delete-kanban.test.ts       # Test per eliminazione kanban
│   ├── get-kanbans.test.ts         # Test per recupero kanban
│   ├── archived-item.test.ts       # Test per archiviazione task
│   ├── save-kanban-state.test.ts   # Test per salvataggio stato kanban
│   ├── get-task-history.test.ts    # Test per storico task
│   └── get-available-snapshots.test.ts  # Test per snapshot disponibili
└── kanban-categories/
    ├── save-kanban-category.test.ts      # Test per salvataggio categorie
    ├── get-kanban-categories.test.ts     # Test per recupero categorie
    └── delete-kanban-category.test.ts    # Test per eliminazione categorie
```

## Prerequisiti

Assicurati di avere installato le dipendenze:

```bash
npm install
```

## Esecuzione dei Test

### Eseguire tutti i test

```bash
npm test
```

### Eseguire i test in modalità watch

```bash
npm run test:watch
```

### Eseguire i test con coverage

```bash
npm run test:coverage
```

### Eseguire test specifici

```bash
# Test per i progetti
npm test -- __tests__/projects

# Test per le kanban
npm test -- __tests__/kanban

# Test per le categorie kanban
npm test -- __tests__/kanban-categories

# Test per un singolo file
npm test -- __tests__/projects/create-item.test.ts
```

## Copertura dei Test

I test coprono i seguenti scenari per ogni azione:

### Progetti (Projects)

- **create-item**: Creazione di nuovi task/progetti
  - Creazione con dati validi
  - Gestione errori di validazione
  - Verifica della colonna kanban
  - Inclusione site_id
  - Gestione posizioni array

- **edit-item**: Modifica di task/progetti esistenti
  - Aggiornamento con dati validi
  - Verifica permessi (site_id)
  - Gestione colonne kanban
  - Validazione dati

- **delete-item**: Eliminazione di task/progetti
  - Eliminazione con verifica permessi
  - Gestione relazioni (TaskHistory, QualityControl, PackingControl)
  - Creazione action record

- **archived-item**: Archiviazione/dearchiviazione
  - Archiviazione task
  - Dearchiviazione task
  - Creazione action record

### Kanban

- **create-item**: Creazione task in kanban
  - Creazione con validazione
  - Gestione fornitori (TaskSupplier)
  - Verifica colonne kanban

- **save-kanban**: Salvataggio kanban
  - Creazione nuova kanban
  - Aggiornamento kanban esistente
  - Gestione colonne (creazione/aggiornamento/eliminazione)
  - Flag skipColumnUpdates
  - Verifica task associati prima dell'eliminazione colonne

- **delete-kanban**: Eliminazione kanban
  - Scollegamento task da kanban e colonne
  - Eliminazione colonne
  - Eliminazione kanban
  - Verifica permessi

- **get-kanbans**: Recupero kanban
  - Fetch con JOIN di colonne e categorie
  - Ordinamento per title e position
  - Filtro per site_id

- **archived-item**: Archiviazione task in kanban
  - Simile a progetti ma con gestione site_id

- **save-kanban-state**: Salvataggio snapshot stato
  - Cooldown di 5 minuti
  - Creazione snapshot per tutti i task
  - Inclusione dati completi task

- **get-task-history**: Recupero storico task
  - Fetch ordinato per data
  - Filtro per taskId

- **get-available-snapshots**: Recupero snapshot disponibili
  - Raggruppamento per minuto
  - Limite 50 snapshot più recenti
  - Conteggio task per snapshot

### Categorie Kanban

- **save-kanban-category**: Salvataggio categorie
  - Creazione nuova categoria
  - Aggiornamento categoria esistente
  - Verifica unicità identifier per site
  - Gestione display_order

- **get-kanban-categories**: Recupero categorie
  - Fetch con ordinamento
  - Filtro per site_id

- **delete-kanban-category**: Eliminazione categorie
  - Verifica che non sia in uso da kanban
  - Eliminazione con verifica permessi

## Mock e Utilities

Il file `setup/mocks.ts` fornisce:

- `mockSupabaseClient()`: Mock del client Supabase
- `mockUserContext()`: Mock del contesto utente
- `mockSiteData()`: Mock dei dati del sito
- `mockTaskData()`: Mock dei dati task
- `mockKanbanData()`: Mock dei dati kanban
- `mockKanbanColumnData()`: Mock delle colonne kanban
- `mockKanbanCategoryData()`: Mock delle categorie kanban

## Note Importanti

1. **Isolamento dei test**: Ogni test è isolato e utilizza mock per le dipendenze esterne
2. **Next.js cache**: Le funzioni `revalidatePath` e `revalidateTag` sono mockate in `jest.setup.js`
3. **Supabase**: Il client Supabase è completamente mockato per evitare chiamate reali al database
4. **Site isolation**: Molte funzioni verificano il `site_id` per garantire l'isolamento multi-tenant

## Troubleshooting

### Jest non trova i moduli

Verifica che il path alias `@/` sia configurato correttamente in `jest.config.js`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Errori di TypeScript

Assicurati che `ts-jest` sia installato e configurato correttamente.

### Test falliscono inspiegabilmente

1. Pulisci la cache di Jest: `npm test -- --clearCache`
2. Verifica che tutti i mock siano resettati in `beforeEach`
3. Controlla che le dipendenze siano aggiornate

## Contribuire

Quando aggiungi nuove azioni:

1. Crea un nuovo file di test nella directory appropriata
2. Utilizza i mock esistenti da `setup/mocks.ts`
3. Segui la struttura dei test esistenti
4. Assicurati di coprire almeno:
   - Caso di successo
   - Gestione errori
   - Validazione input
   - Verifica permessi (site_id)

## Coverage Target

L'obiettivo è mantenere una coverage minima del 80% per le azioni.

Per visualizzare la coverage:

```bash
npm run test:coverage
```

Il report sarà disponibile in `coverage/lcov-report/index.html`.

