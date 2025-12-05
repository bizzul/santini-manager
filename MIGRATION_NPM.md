# Migrazione da Bun a npm - Completata ✅

## Data Migrazione
5 Dicembre 2025

## Motivazione
Per un progetto multitenant in produzione con architettura complessa, la stabilità di npm è preferibile rispetto alla velocità di Bun, specialmente considerando:
- 134 dipendenze di produzione
- Next.js 15.5.2 e React 19.1.1
- Sistema multitenant con RLS critico
- Deployment su Vercel (ottimizzato per Node.js/npm)

## Modifiche Effettuate

### 1. File Rimossi
- ❌ `bun.lock`
- ❌ `bunfig.toml`

### 2. File Modificati

#### `package.json`
```json
"scripts": {
  "dev": "next dev",          // era: "NODE_NO_WARNINGS=1 bun run --bun next dev"
  "build": "next build",
  "start": "next start",
  "lint": "next lint"          // aggiunto
}
```

Aggiunte dipendenze esplicite (spostate da devDependencies a dependencies):
```json
"lightningcss": "^1.30.2",
"@tailwindcss/postcss": "^4.1.12",
"tailwindcss": "^4.1.12"
```

**Motivo**: Tailwind CSS v4 richiede questi pacchetti durante il build su Vercel (non solo in dev)

#### `next.config.js`
- Rimosso: `serverExternalPackages: ["@supabase/supabase-js"]`
- Rimosso: commento "Optimize for Bun runtime"

#### `vercel.json`
Aggiunti comandi di build personalizzati per Vercel:
```json
"buildCommand": "npm install --include=optional && npm run build",
"installCommand": "npm ci --legacy-peer-deps --include=optional"
```

### 3. File Creati
- ✅ `package-lock.json` (258KB)
- ✅ `.npmrc` con `legacy-peer-deps=true`
- ✅ `MIGRATION_NPM.md` (questo documento)

## Ambiente

- **Node.js**: v22.14.0
- **npm**: 11.5.2
- **Package Manager**: npm (era: Bun)

## Installazione

### In Locale
```bash
npm install --legacy-peer-deps
```

### Su Vercel
Vercel userà automaticamente i comandi specificati in `vercel.json`:
```bash
npm ci --legacy-peer-deps --include=optional
```

## Note Importanti

### 1. `.npmrc`
File creato con `legacy-peer-deps=true` perché `@pdfme/generator@4.5.2` ha conflitti di peer dependencies con `@pdfme/common`.

### 2. Tailwind CSS v4 in Production Dependencies
Spostati da `devDependencies` a `dependencies`:
- `@tailwindcss/postcss@4.1.12` - Richiesto da postcss.config.js durante il build
- `tailwindcss@4.1.12` - Core di Tailwind CSS v4
- `lightningcss@1.30.2` - Engine CSS nativo usato da Tailwind v4

**Motivo**: Next.js su Vercel necessita di questi pacchetti durante il build (non solo in sviluppo). L'errore originale era `Cannot find module '@tailwindcss/postcss'` su Vercel.

Il `package-lock.json` include tutti i binari nativi di lightningcss per tutte le piattaforme:
- `lightningcss-darwin-arm64` (macOS ARM)
- `lightningcss-linux-x64-gnu` (Linux x64 - usato da Vercel) ✅
- Altri binari per diverse architetture

### 3. Build Locale
Il build funziona correttamente in locale con warnings di performance su bundle size:
- `static/chunks/477d4af2.302e9df7fd8b4888.js` (557 KiB)
- `app/sites/[domain]/kanban/page` (601 KiB)

Questi warnings non bloccano il deploy.

### 4. Vulnerabilità
```
4 vulnerabilities (1 moderate, 2 high, 1 critical)
```

Per analizzare:
```bash
npm audit
```

Per tentare fix automatico:
```bash
npm audit fix --legacy-peer-deps
```

## Testing

### Build Locale
```bash
npm run build
# ✅ Completato con successo (76s)
```

### Dev Server
```bash
npm run dev
# Server su http://localhost:3000
```

### Verifica Dipendenze
```bash
npm list lightningcss
npm list @tailwindcss/postcss
```

## Deploy su Vercel

Vercel utilizzerà automaticamente:
1. `npm ci --legacy-peer-deps --include=optional` per installazione
2. `npm install --include=optional && npm run build` per build
3. I binari Linux di `lightningcss` saranno installati automaticamente

## Rollback (se necessario)

Per tornare a Bun:
```bash
# Rimuovi npm files
rm -rf node_modules package-lock.json .npmrc

# Reinstalla bun.lock (da git se presente)
git checkout bun.lock bunfig.toml

# Ripristina package.json
git checkout package.json next.config.js vercel.json

# Installa con Bun
bun install
```

## Conclusione

Migrazione completata con successo. Il progetto ora usa npm come package manager, garantendo maggiore stabilità e compatibilità con l'ecosistema Node.js e il deployment su Vercel.

