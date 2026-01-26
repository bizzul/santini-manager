# Manuale d'uso – Moduli principali

Manuale d'uso dei principali moduli dell'applicazione **Santini Manager**, basato su codice e funzionalità implementate.

---

## Indice

1. [Accesso e spazi di lavoro](#1-accesso-e-spazi-di-lavoro)
2. [Dashboard](#2-dashboard)
3. [Kanban](#3-kanban)
4. [Progetti](#4-progetti)
5. [Calendario](#5-calendario)
6. [Contatti](#6-contatti)
7. [Magazzino](#7-magazzino)
8. [Prodotti (Articoli)](#8-prodotti-articoli)
9. [Categorie](#9-categorie)
10. [Errori](#10-errori)
11. [Ore (Time tracking)](#11-ore-time-tracking)
12. [Quality Control e Imballaggio](#12-quality-control-e-imballaggio)
13. [Report](#13-report)

---

## 1. Accesso e spazi di lavoro

### Selezione dello spazio (sito)

Dopo il login, dalla pagina **«I tuoi spazi»** (`/sites/select`) puoi:

- Vedere gli spazi (siti) a cui hai accesso
- Selezionare uno spazio per entrare nella sua area di lavoro

Ogni spazio ha un proprio **dominio**; i dati (clienti, progetti, kanban, ecc.) sono separati per spazio.

### Struttura dell’interfaccia

- **Sidebar (menu laterale)**: accesso ai moduli; i moduli visibili dipendono dalla configurazione attiva per lo spazio
- **Header**: trigger per aprire/chiudere la sidebar
- **Contenuto centrale**: le pagine dei singoli moduli

---

## 2. Dashboard

**Percorso:** `/dashboard`  
**Modulo:** `dashboard` (sempre attivo)

### Funzione

La Dashboard è la **Home** e fornisce:

- **Stato generale** con aggiornamento odierno
- **Grafici e card** su:
  - **Offerte**: andamento e distribuzione (da fare, in corso, inviate, vinte, perse, valore per categoria)
  - **Ordini di produzione**: situazione ordini

### Elementi principali

- **OffersChartCard**: grafico offerte
- **ProductionOrdersCard**: ordini di produzione
- **OffersCard**: riepilogo offerte con filtri per categoria

---

## 3. Kanban

**Percorso:** `/kanban?name=<identificatore>`  
**Modulo:** `kanban`

### Funzione

Gestione del lavoro tramite **board Kanban** con colonne e card trascinabili. Supporta:

- **Kanban “lavoro”** (progetti, produzione, ecc.)
- **Kanban “offerte”** (`is_offer_kanban`): pipeline commerciale con stati come Trattativa, Vinto, Perso

### Accesso alle board

Nel menu **Kanban** nella sidebar:

- Le board sono elencate in modo **dinamico** (caricate dall’API)
- Possono essere raggruppate per **categorie Kanban** (es. Ufficio, Produzione), se configurate
- Cliccando su una board si apre:  
  `/kanban?name=<identificatore>`

Solo i **superadmin** vedono la voce **«Crea Kanban»** per aprire il modal di creazione.

### Creazione e gestione di una Kanban (solo superadmin)

Dal modal **KanbanManagementModal** è possibile:

- **Titolo** e **identificatore** (usato nell’URL)
- **Colore** e **icona**
- **Categoria** (opzionale): scelta da un elenco di categorie Kanban del sito
- **Colonne**:
  - Titolo, identifier, posizione, icona
  - **Tipo** (`column_type`): `normal`, `won`, `lost`, `production`, `invoicing`
  - **Colonna di creazione** (`is_creation_column`): qui appare il pulsante per creare nuove card
- Per le **Kanban offerte**:
  - Flag **«È Kanban offerte»**
  - **Kanban di lavoro di destinazione** e **colonna in cui cambia il codice** (quando un’offerta viene vinta)

### Uso della board

- **Colonne**: ogni colonna è un’area di drop; le card si spostano con **drag & drop** (@dnd-kit).
- **Card (task)**:
  - Visualizzano `unique_code`, titolo, cliente, prodotti/articoli, quantità, prezzi, ecc.
  - Cliccando si apre il dettaglio/modifica
- **Creazione card**: pulsante **«+»** nella colonna con `is_creation_column` (o, in assenza, nella prima colonna).
- **Kanban offerte**:
  - Nella colonna **Trattativa** può essere disponibile un **follow-up** (es. OfferFollowUpDialog)
  - **OfferQuickAdd** per aggiunta rapida
  - **DraftCompletionWizard** per completare le bozze

### Snapshot e cronologia

- **Snapshot**: salvataggio dello stato della board in un determinato momento; è possibile recuperare snapshot disponibili.
- **Cronologia task** (`get-task-history`): storico delle modifiche alle card.

### Aggiornamento in tempo reale

Le board usano **Supabase Realtime** (`useRealtimeKanban`) per aggiornare colonne e card quando altri utenti modificano i dati.

### Categorie Kanban

Le **categorie Kanban** (es. Ufficio, Produzione) servono solo a **raggruppare le board nel menu**.  
Si gestiscono dalla pagina **Categorie Kanban** (se presente, di norma per superadmin).  
Per dettagli: `docs/README-KANBAN-CATEGORIES.md`.

---

## 4. Progetti

**Percorso:** `/projects`  
**Modulo:** `projects`

### Funzione

Gestione dei **progetti** (task/commesse) collegati a:

- Clienti
- Articoli (SellProduct)
- Kanban
- Categorie articoli

### Operazioni

- **Aggiungi progetto**: tramite `DialogCreate` e `createForm` (cliente, articoli, eventuale kanban, categoria, ecc.)
- **Tabella/lista** con `SellProductWrapper`: vista elenco, filtri, azioni per riga
- **Modifica / Elimina / Archivia** tramite azioni sulla singola riga

I progetti sono la base per Ore, Errori, Report, Quality Control e Imballaggio.

---

## 5. Calendario

**Percorso:**  
- `/calendar` (Produzione)  
- `/calendar-installation` (Posa)  

**Modulo:** `calendar`

### Funzione

Visualizzazione **calendaristica** dei **task** (progetti) non archiviati, con informazioni su:

- Kanban di appartenenza (colore, titolo)
- Date e scadenze

### Dati

Vengono caricati i task con `archived = false` e le relative informazioni di Kanban.  
Il componente principale è `CalendarComponent`.

---

## 6. Contatti

Sotto la sezione **Contatti** ci sono quattro moduli.

### 6.1 Clienti

**Percorso:** `/clients`  
**Modulo:** `clients`

**Funzione:** anagrafica clienti.

- **Tabella** con `DataWrapper`
- **Aggiungi cliente** (`DialogCreate` + `dialogCreate`)
- **Import CSV** (`DialogImportCSV`) e **Esporta CSV** (`ButtonExportCSV`)
- **Modifica / Elimina** da azioni sulla riga
- Integrazione con **Azioni** (`Action`): viene mostrata l’ultima modifica (lastAction) per cliente

### 6.2 Fornitori

**Percorso:** `/suppliers`  
**Modulo:** `suppliers`

**Funzione:** anagrafica fornitori con **categoria fornitore** (`supplier_category`).

- **Aggiungi fornitore** (con scelta categoria)
- **Import / Esporta CSV**
- **Modifica / Elimina** da tabella
- Le categorie si gestiscono in **Categorie > Fornitori**

### 6.3 Produttori

**Percorso:** `/manufacturers`  
**Modulo:** `manufacturers`

**Funzione:** anagrafica produttori con **categoria produttore** (`manufacturer_category`).

- **Aggiungi produttore** (con categoria)
- **Import / Esporta CSV**
- **Modifica / Elimina** da tabella
- Categorie in **Categorie > Produttori**

### 6.4 Collaboratori

**Percorso:** `/collaborators`  
**Modulo:** `collaborators`

**Funzione:** gestione dei **collaboratori** collegati allo spazio (sito).

- **Solo lettura** per utenti non amministratori
- **Amministratori** possono:
  - Aggiungere collaboratori (`AddCollaboratorDialog`)
  - Modificare (`EditCollaboratorDialog`)
  - Gestire **ruoli** per lo spazio (`RoleManagementDialog`)
- `DataWrapper` riceve `isAdmin` per mostrare o meno le azioni

---

## 7. Magazzino

**Percorso:** `/inventory`  
**Modulo:** `inventory`

### Funzione

Gestione **inventario** (prodotti a magazzino).

- **Aggiungi prodotto** (`DialogCreate`): form che usa i dati di `fetchInventoryData` (prodotti, categorie, ecc.)
- **Import CSV** (`DialogImportCSV`) e **Esporta CSV** (`ButtonExportCSV`)
- **Tabella** con `DataWrapper`: modifica, elimina
- **Dettaglio / modifica** anche da `inventory/edit/[id]`

Le **categorie** usate per l’inventario sono quelle in **Categorie > Inventario** (`Product_category`).

---

## 8. Prodotti (Articoli)

**Percorso:** `/products`  
**Modulo:** `products`

### Funzione

Catalogo degli **articoli** (SellProduct) in vendita, base per offerte e progetti.

- **Aggiungi articolo** (`DialogCreate`): categoria articolo (SellProductCategory), altri campi prodotto
- **Import / Esporta CSV**
- **Tabella** con `SellProductWrapper`: modifica, elimina, dettaglio
- Le **categorie articoli** si gestiscono in **Categorie > Prodotti** (`/product-categories`)

---

## 9. Categorie

La voce **Categorie** raggruppa quattro sottopagine per tipologia di entità.

### 9.1 Categorie Inventario

**Percorso:** `/categories`  
**Modulo:** `categories`

**Funzione:** gestione delle **categorie prodotti** (`Product_category`) usate in **Magazzino**.

- Tabella con **Aggiungi**, **Modifica**, **Elimina**

### 9.2 Categorie Articoli (Prodotti)

**Percorso:** `/product-categories`  
**Modulo:** (condiviso con `products`)

**Funzione:** gestione delle **categorie articoli** (`SellProductCategory`) usate in **Prodotti** e nei progetti/offerte.

- **Aggiungi categoria articolo**, modifica, elimina

### 9.3 Categorie Fornitori

**Percorso:** `/supplier-categories`  
**Modulo:** `suppliers`

**Funzione:** categorie per i **fornitori** (`supplier_category`).

- CRUD sulle categorie fornitori

### 9.4 Categorie Produttori

**Percorso:** `/manufacturer-categories`  
**Modulo:** `manufacturers`

**Funzione:** categorie per i **produttori** (`manufacturer_category`).

- CRUD sulle categorie produttori

---

## 10. Errori

**Percorso:** `/errortracking`  
**Modulo:** `errortracking`

### Funzione

Registro **errori/segnalazioni** collegati a:

- Progetto (task)
- Fornitore
- Utente che segnala
- Categoria (es. fornitore/altro), tipo, posizione, descrizione
- **Allegati**: upload di file (FileUpload)

### Utilizzo

- **Aggiungi errore** (`DialogCreate` + `createForm`): compilazione di tutti i campi e allegati
- **Tabella** con `DataWrapper`: modifica, elimina, consultazione
- I dati di supporto (task, utenti, ruoli, fornitori, categorie) vengono caricati in parallelo per compilare i select

---

## 11. Ore (Time tracking)

**Percorso:** `/timetracking`  
**Modulo:** `timetracking`

### Funzione

Registro delle **ore lavorate** con:

- **Progetto (task)** o **attività interna**
- **Collaboratore** (utente)
- **Data**, **ore** e **minuti**
- **Descrizione**, eventuale **categoria** descrizione
- **Ruoli** (se applicabile)
- **Tipo attività**: progetto (`project`) o interna (`internal`); in caso di interna, scelta di `InternalActivity`
- **Pranzo fuori sede** e relativo campo testo

### Permessi

- **Utenti normali** (`role === "user"`): vedono **solo i propri** rapporti (`employee_id === user.id`)
- **Admin / altri ruoli**: vedono tutti i rapporti del sito

### Utilizzo

- **Aggiungi rapporto** (`DialogCreate`): form con task, utente, data, ore, minuti, tipo attività, descrizione, pranzo, ecc.
- **Tabella** con `DataWrapper`: modifica, elimina
- I report Ore vengono generati dal modulo **Report** (vedi sotto)

---

## 12. Quality Control e Imballaggio

Nel menu, Quality Control e Imballaggio compaiono come voci sotto **«Reports»** (insieme ai report Ore, Inventario, Progetti, Errori, Imballaggio).

### 12.1 Quality Control

**Modulo:** `qualitycontrol`

**Percorsi:**

- **Quality Control** – `/qualityControl`  
  Vista **report**: se esistono dati di quality control, viene mostrato il *GridReports* con le card di reportistica (es. Report Imballaggio/QC). Se non ci sono dati: messaggio *«Nessun quality control creato»*.

- **Effettua QC** – `/qualityControl/edit`  
  Vista **operativa** (`MobilePage`): elenco di record di quality control su **task non archiviati** e in colonna **«SPEDITO»** (lavori già spediti da controllare). Interfaccia ottimizzata per uso sul campo.

- **Dettaglio QC** – `/qualityControl/edit/[id]`  
  Dettaglio e modifica del singolo record di controllo qualità.

**Funzione:** gestione del **controllo qualità** (`QualityControl` / `quality_control`) collegato a task, items, utente. I dati QC sono usati nei **Report** (es. Report Imballaggio/QC).

### 12.2 Imballaggio (Boxing)

**Modulo:** `boxing`

**Percorsi:**

- **Imballaggio** – `/boxing`  
  **Lista** di tutti i record di **imballaggio** (`PackingControl` / `packing_control`) con task, cliente e utente. Tabella gestita da `SellProductWrapper`. Se non ci sono dati: *«Nessun packing control creato»*.

- **Effettua imballaggio** – `/boxing/edit`  
  Vista **operativa** (`MobilePage`): record su **task non archiviati** e **non** in colonna **«SPEDITO»** (lavori da imballare prima della spedizione). Interfaccia per uso operativo.

- **Dettaglio imballaggio** – `/boxing/edit/[id]`  
  Dettaglio e modifica del singolo record di imballaggio.

**Funzione:** gestione dell’**imballaggio** per progetto/task. I dati sono usati per il **Report PDF Imballaggio** e il **Report Imballaggio/QC**.

---

## 13. Report

**Percorso:** `/reports`  
**Moduli:**  
`report-time`, `report-inventory`, `report-projects`, `report-errors`, `report-imb`

### Funzione

Generazione di **report** in formato **Excel (xlsx)** o **PDF**. Le card disponibili dipendono dai **moduli report abilitati** nello spazio.

### 13.1 Report Inventario

- **Modulo:** `report-inventory`
- **Contenuto:** situazione inventario **attuale**
- **Formato:** Excel
- **Uso:** pulsante **Scarica** senza filtri aggiuntivi

### 13.2 Report Progetti

- **Modulo:** `report-projects`
- **Contenuto:** situazione **progetti attuali**
- **Formato:** Excel
- **Uso:** pulsante **Scarica**

### 13.3 Report Ore

- **Modulo:** `report-time`
- **Contenuto:**  
  - **Admin:** ore di tutti i collaboratori  
  - **Utente:** solo le proprie ore
- **Formato:** Excel
- **Uso:** scelta di un **intervallo di date** (DateRangePicker) con preset (es. anno precedente, primo semestre), poi **Scarica**

### 13.4 Report Errori

- **Modulo:** `report-errors`
- **Contenuto:** errori per **fornitore** e **data**
- **Formato:** Excel
- **Uso:**  
  - Select **fornitore** (opzionale, «Tutti» per nessun filtro)  
  - **Intervallo date**  
  - **Scarica**

### 13.5 Report PDF Imballaggio

- **Modulo:** `report-imb`
- **Contenuto:** PDF di **imballaggio per progetto**
- **Uso:** scelta del **progetto (task)** dal select, poi **Scarica**

### 13.6 Report Imballaggio / QC

- **Modulo:** `report-imb`
- **Contenuto:** report interno **Imballaggio / QC** in Excel
- **Uso:** pulsante **Scarica** senza filtri (data odierna nel nome file)

---

## Moduli e visibilità nel menu

I moduli sono configurabili **per sito** (spazio):

- **Abilitazione**: quali moduli sono attivi (es. `enabledByDefault` o configurazione custom)
- **Categoria**: `core`, `management`, `reports`, `tools`
- **Hook** `useSiteModules` e `getEnabledModuleNames` decidono quali voci di menu mostrare

Se un modulo non è abilitato, la relativa voce **non** compare nella sidebar.

---

## Ruoli e permessi (sintesi)

- **Superadmin**:
  - Creazione/gestione Kanban e categorie Kanban
  - Accesso a sezioni amministrazione (Utenti, Sites) quando non si è in un sito
- **Admin (o ruoli superiori al “user”)**:
  - Report Ore: vedono tutte le ore
  - Collaboratori: possono aggiungere, modificare, gestire ruoli
- **User**:
  - Report Ore: solo le proprie
  - Collaboratori: sola lettura
  - Nessun accesso alla gestione Kanban e alle pagine admin globali

---

## Riferimenti tecnici

- **Moduli e configurazione:** `lib/module-config.ts`
- **Dati lato server:** `lib/server-data.ts`
- **Menu e moduli abilitati:** `components/app-sidebar.tsx`, `hooks/use-site-modules.ts`
- **Categorie Kanban:** `docs/README-KANBAN-CATEGORIES.md`
- **Accesso ai siti:** `docs/README-SITE-ACCESS-TROUBLESHOOTING.md`

---

*Ultimo aggiornamento: basato su codice del progetto Santini Manager.*
