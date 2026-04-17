# Deploy checklist — Quick Win 2026-04-17

Da eseguire **dopo** che il testing locale in `TESTING-LOCAL-QW-2026-04-17.md` è passato.

Obiettivo: testare i quick win online sui **siti copia** in categoria "Demo alpha" senza impattare gli utenti reali.

## Step 1 — Env vars su Vercel (prima del push)

Vai su **Vercel → santini-manager → Settings → Environment Variables** e aggiungi:

| Variabile | Valore | Environments |
|-----------|--------|--------------|
| `CRON_SECRET` | Genera un UUID casuale | Production + Preview |
| `DEBUG_API_SECRET` | Genera un altro UUID casuale | Production + Preview |

Consiglio: genera con `openssl rand -hex 32`.

Senza queste variabili:
- Il cron in produzione risponderà 503 (innocuo per gli utenti ma il task archival si ferma).
- I debug endpoint in produzione saranno 404 (voluto). In preview per debuggare, serve il secret.

## Step 2 — Applica migration `ipg` al DB Supabase

Una sola esecuzione. Sicura perché additiva (aggiunge `ipg` ai valori consentiti, non rimuove nulla).

**Opzione A — Supabase CLI locale** (se linkato al progetto prod):

```bash
cd /Users/matteopaolocci/santini-manager
supabase db push
```

**Opzione B — Supabase Dashboard → SQL Editor**:
Copia il contenuto di `supabase/migrations/20260418090000_add_ipg_to_attendance_checks.sql` e premi Run.

**Verifica subito dopo** in SQL Editor:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('attendance_entries'::regclass, 'leave_requests'::regclass)
  AND contype = 'c';
```

Deve comparire `'ipg'` nella lista valori.

## Step 3 — Push branch (crea preview Vercel)

Solo dopo che i miei commit atomici sono locali e hai verificato `git log` che li vedi tutti.

```bash
cd /Users/matteopaolocci/santini-manager
git push -u origin feat/fdm-quick-wins-2026-04-17
```

Vercel, entro ~2 minuti, farà il **preview deploy**. URL tipo:
`https://santini-manager-git-feat-fdm-quick-wins-<team>.vercel.app`

Apri la dashboard Vercel e copia l'URL esatto del deploy preview.

## Step 4 — Duplica siti in categoria "Demo alpha"

Nell'app in **produzione** (o dal preview, stesso DB):

1. Vai in **Administration → Siti** (`/administration/sites`).
2. Apri il sito che vuoi duplicare → pulsante **"Duplica sito"** (componente `DuplicateSiteButton.tsx`).
3. Nel nome della copia **includi "alpha"** o "alfa" (es. `santini-alpha`, `acme-alfa-test`): la categorizzazione automatica in `components/sites-select/sites-grid-client.tsx:32` (`ALPHA_KEYS = ["alpha", "alfa"]`) li piazza nella colonna "Demo alpha".
4. Verifica nella pagina `/sites/select` che i nuovi siti compaiano nella colonna "Demo alpha".

**Importante:** la copia dei dati avviene tramite `lib/demo/service.ts` (`seedDemoWorkspaceData`). I dati di test avranno `site_id` separato dai siti originali → nessun impatto sugli utenti reali.

## Step 5 — Test sul preview URL con siti demo alpha

Apri il preview URL Vercel in incognito (per separare cookie da produzione):

1. **Login** con un utente di test.
2. Apri uno dei siti alpha duplicati (`/sites/<nome-alpha>`).
3. Rifai la checklist test di `TESTING-LOCAL-QW-2026-04-17.md` sezioni 4, 5, 6, 7 puntando al preview URL.
4. In particolare:
   - [ ] Kanban move card funziona
   - [ ] Dashboard mostra dati
   - [ ] Presenze: salvataggio stato `IPG` ok
   - [ ] Richiesta ferie con `leave_type=ipg` ok
   - [ ] Nessun 500 su nessuna API chiamata
   - [ ] Cron con secret: `curl -H "Authorization: Bearer $CRON_SECRET" <preview-url>/api/cron/auto-archive` → 200
   - [ ] Debug senza secret: `<preview-url>/api/debug/basic` → 404
   - [ ] Debug con secret: `<preview-url>/api/debug/basic?secret=$DEBUG_API_SECRET` → 200

## Step 6 — CI GitHub Actions deve essere verde

Il primo push attiverà il workflow `.github/workflows/ci.yml`. Verifica su GitHub:

- [ ] Job `quality` (lint + typecheck + test + build) **verde**
- [ ] Job `secret-scan` **verde**

Se un job fallisce: correggiamo prima di merge.

## Step 7 — Merge in `main`

Solo dopo Step 5 + Step 6 verdi.

1. Apri Pull Request da `feat/fdm-quick-wins-2026-04-17` verso `main`.
2. CI sulla PR ri-valida tutto.
3. Merge (preferisci "Squash and merge" per mantenere history pulita o "Rebase and merge" se vuoi vedere i 7 commit atomici).
4. Produzione si aggiorna automaticamente da Vercel.

## Step 8 — Verifica post-deploy in produzione

Subito dopo il merge:

- [ ] `https://<dominio-prod>/api/cron/auto-archive` → 401 senza secret (prova)
- [ ] `https://<dominio-prod>/api/cron/auto-archive` con secret → 200
- [ ] `https://<dominio-prod>/api/debug/basic` → 404 (gate attivo)
- [ ] Login utente reale + navigazione kanban + dashboard → nessuna regressione
- [ ] Local Storage mostra `matris-query-cache-v2` (una sola chiave)

## Rollback plan

Se qualcosa va storto in produzione **dopo** il merge:

1. Vercel → Deployments → promuovi il deploy precedente.
2. Se la migration `ipg` causa problemi (improbabile, è additiva): rollback SQL in `TESTING-LOCAL-QW-2026-04-17.md` sezione 6.
3. `git revert <sha commit>` per il quick win specifico che ha introdotto il problema, poi nuovo PR.

## Note finali

- I **siti duplicati in Demo alpha** rimangono anche dopo il merge. Puoi tenerli come ambiente di regressione permanente per i prossimi quick win.
- Il `CRON_SECRET` usato in Vercel va anche configurato nel **Vercel Cron** (Settings → Cron Jobs): aggiungi l'header `Authorization: Bearer $CRON_SECRET` alla definizione del cron, altrimenti il task archival risponde 401.
