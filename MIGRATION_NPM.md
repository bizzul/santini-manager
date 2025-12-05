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

Aggiunta dipendenza esplicita:
```json
"lightningcss": "^1.30.2"
```

Spostate da `devDependencies` a `dependencies` (richieste per build e type checking su Vercel):
```json
"@tailwindcss/postcss": "^4.1.17",
"tailwindcss": "^4.1.17",
"postcss": "^8.5.6",
"typescript": "^5.9.3",
"@types/react": "19.1.12",
"@types/react-dom": "19.1.9",
"@types/node": "^18.19.123",
"@types/qrcode": "^1.5.5",
"@types/express": "^4.17.23",
"@types/react-datepicker": "^4.19.6",
"@types/formidable": "^2.0.6",
"@types/fs-extra": "^11.0.4",
"@types/js-cookie": "^3.0.6",
"@types/multer": "^1.4.13"
```

**Motivo**: Next.js su Vercel esegue type checking durante il build di produzione e richiede TUTTI i type definitions usati nel progetto.

Aggiunte `optionalDependencies` per garantire installazione binari lightningcss su Vercel:
```json
"lightningcss-darwin-arm64": "^1.30.2",
"lightningcss-darwin-x64": "^1.30.2",
"lightningcss-linux-arm-gnueabihf": "^1.30.2",
"lightningcss-linux-arm64-gnu": "^1.30.2",
"lightningcss-linux-arm64-musl": "^1.30.2",
"lightningcss-linux-x64-gnu": "^1.30.2",  // ← Richiesto da Vercel
"lightningcss-linux-x64-musl": "^1.30.2",
"lightningcss-win32-arm64-msvc": "^1.30.2",
"lightningcss-win32-x64-msvc": "^1.30.2"
```

#### `styles/fonts.ts`
- **File completamente eliminato** per semplificare e risolvere problemi
- Font ora importati direttamente in `app/layout.tsx`
- Usato solo **Inter** (Google Font) che è sempre affidabile

#### `middleware.ts`
- Aggiunto `export const runtime = 'nodejs'` per forzare Node.js runtime
- **Motivo**: Supabase usa API Node.js (`process.versions`, `process.version`) non disponibili nell'Edge Runtime
- Risolve errore: "A Node.js API is used which is not supported in the Edge Runtime"

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

### 2. Tailwind CSS v4.1.17 (Aggiornato) in Production Dependencies
Spostati da `devDependencies` a `dependencies` e **aggiornati all'ultima versione**:
- `@tailwindcss/postcss@4.1.17` - Richiesto da postcss.config.js durante il build (era 4.1.12)
- `tailwindcss@4.1.17` - Core di Tailwind CSS v4 (era 4.1.12)
- `postcss@8.5.6` - Richiesto da Next.js durante il build
- `lightningcss@1.30.2` - Engine CSS nativo usato da Tailwind v4

**Motivo**: Next.js su Vercel necessita di questi pacchetti durante il build di produzione (non solo in sviluppo). L'errore originale era `Cannot find module '@tailwindcss/postcss'` su Vercel.

Il `package-lock.json` include tutti i binari nativi di lightningcss per tutte le piattaforme:
- `lightningcss-darwin-arm64` (macOS ARM)
- `lightningcss-linux-x64-gnu` (Linux x64 - usato da Vercel) ✅
- Altri binari per diverse architetture

### 3. Semplificazione Font
**Problema**: Il file `styles/fonts.ts` con font locali causava errori su Vercel con `next/font`.

**Soluzione**: 
- **Eliminato completamente** `styles/fonts.ts`
- Font importato direttamente in `app/layout.tsx`:
  ```typescript
  import { Inter } from "next/font/google";
  
  const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
  });
  ```
- Semplificazione drastica: un solo font, zero problemi di path, zero complessità.

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
# ✅ Completato con successo (14.3s con cache)
```

**Warnings (non bloccanti)**:
- Bundle size per `static/chunks/477d4af2.302e9df7fd8b4888.js` (557 KiB)
- Entrypoint size per `app/sites/[domain]/kanban/page` (601 KiB)
- API route size per `app/api/reports/imb/route.js` (4.95 MiB)

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

