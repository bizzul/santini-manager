# Feature Flags e variabili d'ambiente rilevanti (FDM)

Questa nota consolida le variabili `NEXT_PUBLIC_*` utilizzate per garantire
parita' operativa fra ambiente locale e online, evitando falsi bug dovuti a
stato persistito (localStorage) o differenze di configurazione.

## Flag UI kanban / card

### `NEXT_PUBLIC_ENABLE_CARD_PREFS`
- **Tipo:** `"true" | undefined`
- **Dove:**
  - `components/kanbans/Card.tsx` (`shouldPersistVisualPreferences`)
  - `components/kanbans/KanbanBoard.tsx` (`shouldPersistCardConfigLocally`)
- **Scopo:** abilita il salvataggio/lettura delle preferenze card kanban in
  `localStorage` (`isSmall-*`, `card-cover-preference-*`, `kanban-card-fields-*`).
- **Raccomandazione:**
  - `production`: `true`
  - `staging`: `true` solo se si vuole UX identica a prod
  - `development`: `false` se si vogliono riproduzioni pulite
- **Reset utente:** pulsante "Reset preferenze" nella toolbar Kanban.

### `NEXT_PUBLIC_SHOW_COVER_SOURCE_BADGE`
- **Tipo:** `"true" | undefined`
- **Dove:**
  - `components/kanbans/Card.tsx`
  - `components/kanbans/editKanbanTask.tsx`
- **Scopo:** mostra un badge di debug che indica da quale fonte proviene
  l'immagine di copertina (prodotto/progetto/placeholder).
- **Raccomandazione:**
  - `production`: non impostato (`undefined`)
  - `staging`: opzionale per QA visivo
  - `development`: `true` se stai lavorando sul resolver copertina

## Flag Command Deck

### Sorgente di verita: `site_settings.command_deck_enabled`
- **Tipo:** boolean persistito nella tabella `site_settings` (stessa usata
  per tema, support bot e vertical profile). Chiave:
  `command_deck_enabled` (costante in `lib/command-deck-settings.ts`).
- **Dove si imposta:** pannello superadmin di ciascun sito
  (`/administration/sites/{id}/edit`), card "3D Desk View" che apre la
  modale `SiteCommandDeckModal`.
- **Dove si legge:**
  - Server: `getCommandDeckEnabledForSite(siteId)` (React.cache-wrapped)
    in `lib/command-deck-settings.ts`. Usato dal layout del sito
    (`app/sites/[domain]/layout.tsx`) e dalla rotta del Command Deck
    per gate 404.
  - API: `GET /api/sites/[domain]` restituisce il flag nel payload, cosi
    il sidebar client lo ha gia in cache React Query
    (`["site-data", domain]`).
  - Client: `CommandDeckLauncher` legge il flag dalla query cache via
    `useQueryClient().getQueryData(["site-data", domain])` e nasconde
    il bottone quando `false`.
- **Migration:** nessuna — la tabella `site_settings` esiste gia, la
  scrittura passa per `/api/settings/site-config` (PUT generico).
- **Comportamento:**
  - `true` → launcher visibile in sidebar, rotta `/command-deck` attiva
    con dati reali degli spazi.
  - `false` (o assente) → launcher nullo, rotta `notFound()`.

> Nota storica: le versioni 2.3 e 2.4 gating erano basate su regex sul
> subdomain (`/copia/i`) o su allowlist `NEXT_PUBLIC_COMMAND_DECK_DOMAINS`.
> Entrambe sono state sostituite dal flag per-sito a partire dalla 2.5.

## Flag internazionalizzazione

### `NEXT_PUBLIC_TIMEZONE`
- **Tipo:** stringa IANA timezone. Fallback: `"Europe/Zurich"`.
- **Dove:**
  - `lib/utils.ts` (`APP_TIMEZONE`)
  - `package/utils/dates/date-manager.ts`
- **Scopo:** imposta il timezone applicativo usato per le conversioni
  `YYYY-MM-DD` e la formattazione locale.
- **Raccomandazione:** stesso valore in tutti gli ambienti (tipicamente
  `Europe/Zurich`).

## Flag dominio/URL

### `NEXT_PUBLIC_ROOT_DOMAIN`
- **Dove:** componenti amministrazione sito, domain configuration.
- **Scopo:** dominio radice per costruire sottodomini siti.
- **Raccomandazione:** allineare fra `.env.local` e variabili Vercel.

### `NEXT_PUBLIC_URL`
- **Dove:** routing assoluto per redirect/email transazionali.
- **Raccomandazione:** impostare sempre la URL pubblica effettiva.

### `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Dove:** client Supabase browser.
- **Raccomandazione:** tenere allineati con le variabili server lato Vercel.

## Storage locale rilevante

Anche se non sono "flag" in senso stretto, queste chiavi possono far percepire
"bug" quando sono divergenti fra locale e online:

| Chiave | Scope | Pulizia |
|---|---|---|
| `isSmall-<taskId>` | card compressa/estesa | bottone Reset preferenze kanban |
| `card-cover-preference-<taskId>` | copertina prodotto/progetto | bottone Reset preferenze kanban |
| `kanban-card-fields-<kanbanId>` | campi card configurati | bottone Reset preferenze kanban |

## Checklist parita' ambiente (smoke test)

1. Variabili `NEXT_PUBLIC_*` documentate sopra allineate fra locale e Vercel.
2. `localStorage` pulito quando si riproduce un bug utente (`Reset preferenze`).
3. `Europe/Zurich` come timezone applicativo in tutti gli ambienti.
4. Utente di test con stesso ruolo di quello online che riporta il bug.
5. Build senza warning su env (`npm run build`).
