---

# Stream 6 - DX, Testing & Observability

## Sommario esecutivo

**F-014** è **confermato**: non esiste `.github/workflows/` nel repo; nessuna CI versionata per lint/test/build/security scan.

**F-015** è **confermato**: Jest copre soprattutto **Server Actions** sotto `app/sites/[domain]/**/actions/*.action.ts`, **lib/validation**, **auth callback**; **nessun test** importa handler in `app/api/**/route.ts` (149 route API senza test diretti).

**F-019** è **confermato**: `lib/logger.ts` esiste e viene usato in molti punti, ma restano **`console.*` sparsi** (es. `app/api/kanban/tasks/move/route.ts:39` accanto a `logger` alle righe 43+). I file più rumorosi includono script operativi e alcuni layer dati/azioni.

**Area checklist F** (`docs/AUDIT-ARCH-DATA-CHECKLISTS.md:58-66`): mappatura API, suite minima, logging uniforme, gate build sono **parzialmente** soddisfatti; **M4** (`docs/AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md:67-81`) richiede CI + test API critici: **non ancora implementato**.

---

## Stato attuale test (tabella: area | file test | API coperta? | gap)

| Area | File test | Route `app/api/**` coperta? | Gap |
|------|-----------|----------------------------|-----|
| Kanban actions | `__tests__/kanban/save-kanban.test.ts` | No (solo `save-kanban.action`) | Nessun test su `app/api/kanban/**/route.ts` (es. `tasks/move`, `tasks/route`) |
| Kanban | `__tests__/kanban/get-kanbans.test.ts`, `save-kanban-state.test.ts`, `create-item.test.ts`, `delete-kanban.test.ts`, `archived-item.test.ts`, `get-task-history.test.ts`, `get-available-snapshots.test.ts` | No | Stessa distanza rispetto alle REST API parallele |
| Categorie kanban | `__tests__/kanban-categories/*.test.ts` | No | API `app/api/kanban/categories/**` non coperte da Jest |
| Progetti | `__tests__/projects/create-item.test.ts`, `edit-item.test.ts`, `delete-item.test.ts`, `archived-item.test.ts` | No | API progetti/task REST non coperte |
| Validazione | `__tests__/validation/task-create-validation.test.ts` | No (schema Zod) | Utile per input; non sostituisce test HTTP |
| Lib | `__tests__/lib/voice-command-config.test.ts`, `demo-service.test.ts`, `offers.test.ts` | No | — |
| Timetracking | `__tests__/timetracking/timetracking-instructions.test.ts` | No | `app/api/time-tracking/**` non coperto |
| Auth | `__tests__/auth/demo-auth-callback.test.ts` | **Sì, ma non sotto `app/api`**: testa `GET` di `app/(auth)/auth/callback/route.ts` | Unica “route handler” esercitata; **zero** test su `app/api/**/route.ts` |

**Sintesi coverage Jest vs API:** le **149** route in `app/api/**/route.ts` risultano **non importate** dai test (`grep` su `__tests__` per `app/api` e `/api/` senza match). La configurazione `jest.config.js:19-23` imposta `collectCoverageFrom` solo su `app/**/actions/**/*.ts`, quindi **anche le metriche coverage escludono di default le API route** — coerente con il gap segnalato in F-015.

---

## Piano suite minima (tabella: endpoint | tipo test | priorità)

| Endpoint (esempi) | Tipo test | Priorità |
|-------------------|-----------|----------|
| `POST /api/kanban/tasks/move` | Unit/integration con mock Supabase + header `x-site-id` / host | P0 |
| `POST /api/sell-products/import-csv`, `POST /api/clients/import-csv`, `api/products/import-csv` | Validazione body, errori parsing CSV, auth | P0 |
| `POST /api/time-tracking/create`, `DELETE .../delete`, `GET .../my-entries` | Regole business, tenant, permessi | P0 |
| `GET/POST /api/sites/[domain]/attendance` | Filtri data/utente, isolamento sito | P1 |
| `PATCH /api/sites/[domain]/users/[userId]/permissions` | Transazioni/rollback (allineato backlog F-005) | P1 |
| `GET/POST /api/cron/auto-archive` | Header `CRON_SECRET`, 401 senza secret | P0 |
| `app/api/debug/**` | Assenza o 403 fuori dev (feature flag / `NODE_ENV`) | P1 |
| `POST /api/error-tracking/create` | Zod + mapping `employee_id` / auth | P2 |

Strumenti consigliati: `next/jest` con mock di `NextRequest`/`createClient`, oppure test E2E (Playwright) per smoke — fuori scope dello stato attuale.

---

## CI proposto (YAML completo in code block)

Repository senza workflow: proposta minimal su `ubuntu-latest`, Node 20, cache npm, gate sequenziali. Scan segreti come step di fail (pattern come da richiesta; adattare branch se non `main`).

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npx tsc --noEmit

      - name: Unit tests
        run: npm test -- --ci --coverage

      - name: Build
        run: npm run build
        env:
          # Impostare segreti fittizi o da GitHub Secrets se la build li richiede
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: test-anon-key

      - name: Secret scan (fail on match)
        run: |
          set -euo pipefail
          if rg "ghp_|github_pat_|postgresql://postgres:" -n --glob '!node_modules/**' .; then
            echo "::error::Potential secret pattern detected"
            exit 1
          fi
          echo "Secret scan passed"
```

Note: potrebbe servire una matrice di env per far passare `next build` (variabili reali solo in Secrets, mai in chiaro).

---

## Logging issues (tabella: file | occorrenze `console.*` | sostituzione)

Conteggio da ricerca `console.(log|warn|error|info|debug)` su `*.ts`/`*.tsx` (ordine per impatto operativo/codice applicativo).

| File | `console.*` (conteggio approssimativo) | Sostituzione suggerita |
|------|----------------------------------------|-------------------------|
| `scripts/diagnose-site-access.ts` | ~50 | `logger.scope("diagnose")` o log strutturato CLI-only |
| `scripts/fix-user-site-access.ts` | ~34 | Idem |
| `scripts/assign-kanbans-to-categories.ts` | ~30 | Idem |
| `scripts/test-vercel-setup.ts` | ~28 | Idem |
| `scripts/check-kanban-status.ts` | ~24 | Idem |
| `scripts/seed-kanban-categories.ts` | ~25 | Idem |
| `scripts/create-superuser.ts` | ~21 | Idem |
| `app/sites/[domain]/kanban/actions/save-kanban.action.ts` | ~14 | `logger` / `logger.scope("save-kanban")` |
| `app/api/users/[userId]/assigned-roles/route.ts` | ~12 | `logger.error` / `logger.debug` per tracciamento |
| `lib/server-data.ts` | ~10 | Ridurre rumore; query solo in dev via `logger.db` |
| `app/(auth)/auth/callback/route.ts` | ~10 | `logger` con livelli |
| `app/api/sites/[domain]/users/[userId]/permissions/route.ts` | ~10 | Uniformare a `logger` |
| `app/api/kanban/tasks/move/route.ts` | 2 (`console.error` ~39 + uso `logger` altrove) | Sostituire `console.error` con `logger.error` |

`lib/logger.ts:43-73` usa già `console.*` sotto forma di wrapper: la migrazione è **sostituire chiamate dirette** nel codice applicativo con `logger.*`.

---

## Quality gates mancanti

- **CI versionata (F-014):** assente.
- **ESLint in build:** `next.config.js:16-18` — `eslint: { ignoreDuringBuilds: true }` → la build **non fallisce** per lint (allineato a checklist Area F).
- **`typescript.ignoreBuildErrors`:** **non** presente in `next.config.js` (solo `eslint` ignorato); TypeScript resta enforced da `next build` se non configurato diversamente.
- **`tsc` strict:** `tsconfig.json:11` — `"strict": true` già attivo.
- **Pre-commit automatizzato:** nessun `husky` / `lint-staged` in `package.json` o grep progetto; la checklist in `docs/RELEASE-CHECKLIST-FDM.md:12-16` è **manuale**.
- **Coverage API:** `jest.config.js:19-23` non include `app/api/**`.

---

## Findings nuovi S6-F&lt;NN&gt;

| ID | Finding |
|----|---------|
| **S6-F001** | `collectCoverageFrom` in `jest.config.js:19-23` esclude `app/api/**`, rinforzando il “buco” di misurazione sulle route REST. |
| **S6-F002** | Gate lint disattivato in produzione via `eslint.ignoreDuringBuilds: true` (`next.config.js:16-18`); CI proposta deve esplicitamente eseguire `npm run lint`. |
| **S6-F003** | Nessuno script `typecheck` dedicato in `package.json:5-13` (solo `build` implicito); utile aggiungere `tsc --noEmit` per CI/local più veloce della build completa. |

---

## Findings audit esistenti confermati

| ID | Stato |
|----|--------|
| **F-014** | Confermato: nessuna `.github/workflows/`. |
| **F-015** | Confermato: test su actions/lib/validation/callback; **nessun** test diretto su handler `app/api/**/route.ts`. |
| **F-019** | Confermato: coesistenza `logger` e `console.*` (esempio documentato `app/api/kanban/tasks/move/route.ts`). |

---

## Quick wins

1. Aggiungere workflow CI (YAML sopra) su `main` + PR.
2. Estendere `collectCoverageFrom` a `app/api/**/route.ts` quando esistono i primi test.
3. Sostituire `console.error` in `app/api/kanban/tasks/move/route.ts:39` con `logger.error`.
4. Script `npm run typecheck`: `tsc --noEmit`.
5. Documentare in README o `RELEASE-CHECKLIST` che `verify:online` richiede `NEXT_PUBLIC_URL` (`scripts/verify-online.ts:14-17`).

---

## Interventi strutturali

1. Libreria di **test helpers** per `NextRequest` + mock `createClient` condivisi tra route API.
2. **E2E** mirati (login, move card, import CSV) per complementare unit su handler.
3. Rimuovere gradualmente `ignoreDuringBuilds` dopo backlog lint pulito (o tenerlo ma con **CI obbligatoria** come gate reale).
4. **Osservabilità:** dominio “error tracking” QC (`Errortracking`, `app/api/error-tracking/create/route.ts`, UI `components/errorTracking/`) — **non** equivale a APM/Sentry; valutare integrazione esterna se servono stack trace aggregati.

---

## Contraddizioni con la roadmap

Nessuna contraddizione logica: **M4** richiede CI e test API critici; lo stato attuale è **in ritardo** rispetto al deliverable, non in conflitto. La checklist F menziona allineamento gate build: oggi **lint** è bypassato in build (`next.config.js`), quindi il “quality gate” va spostato in **CI** fino a riattivazione ESLint in build.

---

## Domande aperte

1. **Branch default** del remote (`main` vs `master`) per il trigger CI?
2. **`next build` in CI:** elenco completo variabili obbligatorie per evitare fallimenti (Supabase, AI, ecc.)?
3. Priorità tra **test unitari route** vs **E2E** per kanban move e import CSV?
4. Policy su **`ignoreDuringBuilds`:** rimozione target o accettazione permanente con CI-only lint?

---

*Percorsi assoluti citati: `/Users/matteopaolocci/santini-manager/` + path relativi come sopra.*
