# Prompt per Octoparse - Scraping completo dadesign.ch

## Obiettivo
Estrarre TUTTI i 102 prodotti dal sito https://www.dadesign.ch/category/all-products e le relative pagine di dettaglio, per generare un CSV pronto per l'importazione.

---

## FASE 1: Estrarre tutti i link prodotto dalla pagina catalogo

### URL di partenza
```
https://www.dadesign.ch/category/all-products
```

### Istruzioni
1. **Aprire la pagina** https://www.dadesign.ch/category/all-products
2. **Cliccare sul pulsante "Carica altro"** ripetutamente fino a quando non scompare (il sito mostra ~24 prodotti per volta, con 102 prodotti totali servono circa 4-5 click)
3. **Attendere il caricamento** di ogni batch (2-3 secondi tra un click e l'altro)
4. Una volta caricati tutti i 102 prodotti, **estrarre da ogni card prodotto**:

### Selettori CSS da usare (sito Wix)
- **Container prodotti**: `[data-hook="product-list-wrapper"]` oppure i singoli item in `.grid-item`
- **Nome prodotto**: `[data-hook="product-item-name"]`
- **Prezzo**: `[data-hook="product-item-price-to-pay"]`
- **Prezzo originale (se in promo)**: `[data-hook="product-item-price-before-discount"]`
- **Link prodotto**: l'attributo `href` del link che contiene la card
- **Immagine**: `img` dentro la card prodotto → attributo `src`

### Campi da estrarre dalla lista
| Campo | Descrizione |
|-------|-------------|
| `product_name` | Nome del prodotto |
| `product_url` | URL completo della pagina prodotto |
| `price` | Prezzo attuale (es. "CHF221.00") |
| `original_price` | Prezzo originale se in promo, altrimenti vuoto |
| `image_url` | URL dell'immagine principale |
| `badge` | Eventuale badge ("New", "PROMO", "I più venduti") |

---

## FASE 2: Navigare ogni pagina prodotto per i dettagli

Per ogni URL prodotto estratto nella Fase 1, aprire la pagina e raccogliere:

### Selettori CSS per le pagine prodotto
- **Nome**: `[data-hook="product-title"]` oppure `h1`
- **Prezzo**: `[data-hook="product-price"]`
- **Descrizione**: `[data-hook="info-section-description"]` oppure il blocco `pre` / testo nella sezione descrizione
- **SKU**: `[data-hook="sku"]` (se presente)
- **Opzioni colore**: `[data-hook="option-title"]` e le opzioni disponibili
- **Immagine principale**: `[data-hook="main-media-image"]` → attributo `src`

### Campi da estrarre dal dettaglio
| Campo | Descrizione |
|-------|-------------|
| `product_name` | Nome prodotto (h1) |
| `description` | Descrizione completa del prodotto |
| `price` | Prezzo |
| `original_price` | Prezzo originale (se scontato) |
| `sku` | Codice SKU (se presente) |
| `image_url` | URL immagine ad alta risoluzione |
| `product_url` | URL della pagina |
| `colors` | Colori disponibili (se presenti) |
| `dimensions` | Dimensioni (estrarre dalla descrizione) |

---

## FASE 3: Formato output CSV

Esportare i dati nel seguente formato CSV con header italiani (necessario per l'importazione automatica):

```
COD_INT,CATEGORIA,NOME_PRODOTTO,SOTTOCATEGORIA,DESCRIZIONE,LISTINO_PREZZI,URL_IMMAGINE,URL_DOC
```

### Regole di mappatura

| Campo CSV | Come compilare |
|-----------|----------------|
| `COD_INT` | Generare come `DDS-` + abbreviazione del nome (es. "DDS-AI-LITE"). Se c'è SKU, usare quello. |
| `CATEGORIA` | Assegnare in base al tipo di prodotto (vedi tabella categorie sotto) |
| `NOME_PRODOTTO` | Nome completo del prodotto |
| `SOTTOCATEGORIA` | Sotto-tipo più specifico (vedi tabella) |
| `DESCRIZIONE` | Descrizione completa dalla pagina dettaglio |
| `LISTINO_PREZZI` | Sempre "SI" |
| `URL_IMMAGINE` | URL dell'immagine principale del prodotto |
| `URL_DOC` | URL della pagina prodotto (es. https://www.dadesign.ch/product-page/...) |

### Tabella categorie da usare

| Parole chiave nel nome/descrizione | CATEGORIA | SOTTOCATEGORIA |
|-------------------------------------|-----------|----------------|
| sedia, A.I, chair, Masters | Sedute | Sedie |
| poltrona, dormeuse, lounge | Sedute | Poltrone |
| console | Sedute | Console |
| lampada, lamp, light, Poldina, Pina, Geen-a, Kabuki, battery | Illuminazione | Lampade da tavolo / Lampade da terra |
| tavolo, table, square | Tavoli | Tavoli |
| vaso, vase, okra, jelly | Vasi e Contenitori | Vasi |
| centrotavola, trullo, pumo | Vasi e Contenitori | Centrotavola |
| componibili, libreria, specchio, orologio, TIC&TAC | Complementi d'arredo | Contenitori / Librerie / Specchi / Orologi |
| vassoio, cavatappi, tappo, bollitore, spremiagrumi, tostapane | Cucina e Tavola | Vassoi / Accessori cucina / Elettrodomestici |
| ciotola, tigrito | Cucina e Tavola | Accessori animali |
| tazza, mug, porcelain | Tazze | Tazze |
| custodia, wash bag, borraccia, notebook, taccuino, mat, tappeto | Accessori | Custodie / Astucci / Borracce / Cancelleria / Tappeti |
| radio, speaker | Audio e Tecnologia | Radio |

---

## Note tecniche importanti

1. **Il sito è costruito su Wix** - usa rendering dinamico JavaScript. Assicurarsi che Octoparse usi il browser integrato con JavaScript abilitato.
2. **"Carica altro" button** - È fondamentale cliccare questo pulsante RIPETUTAMENTE prima di estrarre i dati. Cercarlo con il selettore `[data-hook="load-more-button"]` o il testo "Carica altro".
3. **Immagini Wix** - Gli URL delle immagini Wix seguono il pattern `https://static.wixstatic.com/media/...`. Per ottenere la versione ad alta risoluzione, rimuovere i parametri di ridimensionamento dall'URL (tutto dopo `/v1/fill/...`).
4. **Encoding** - Salvare il CSV in UTF-8 per mantenere i caratteri speciali (é, ò, ù, ecc.).
5. **Separatore** - Usare la virgola `,` come separatore. Racchiudere i campi con virgole interne tra doppi apici `"`.
6. **Timeout** - Impostare un timeout di almeno 5 secondi tra il caricamento di ogni pagina prodotto per evitare blocchi.

---

## Workflow Octoparse consigliato

1. Creare un nuovo task con URL: `https://www.dadesign.ch/category/all-products`
2. Aggiungere azione "Click" sul pulsante "Carica altro" in loop (condizione: il pulsante esiste)
3. Aggiungere azione "Extract" per raccogliere tutti i link prodotto dalla lista
4. Per ogni link, aprire la pagina e aggiungere azione "Extract" per nome, descrizione, prezzo, SKU, immagine
5. Configurare l'esportazione in CSV con le colonne specificate sopra
6. Eseguire il task

Il risultato atteso è un CSV con tutti i 102 prodotti e le loro descrizioni complete, pronto per essere importato nel sistema.
