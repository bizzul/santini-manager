# Checklist test locale — Quick Win 2026-04-17

Test da eseguire su `http://localhost:3000` prima del push su GitHub. Il `npm run dev` è già attivo.

## Pre-requisiti

- [ ] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STORAGE_SUPABASE_SERVICE_ROLE_KEY` (già presenti per dev).
- [ ] (Opzionale) Aggiungi `CRON_SECRET=testcron123` e `DEBUG_API_SECRET=testdbg123` in `.env.local` se vuoi testare i flussi "autorizzati". Riavvia `npm run dev` dopo la modifica.

## 1) Typecheck + lint

```bash
npm run typecheck        # deve uscire senza errori
npm run lint             # può avere warning, non errori
```

Accettabile se `typecheck` passa. Lint può avere warnings pre-esistenti non legati ai quick win.

## 2) Cron auto-archive (`CRON_SECRET` obbligatorio)

In terminale separato:

```bash
# 1) senza secret configurato localmente (se non hai messo CRON_SECRET in .env.local)
curl -i http://localhost:3000/api/cron/auto-archive
# Atteso: HTTP/1.1 503 Service Unavailable, body: {"error":"Cron secret not configured"}

# 2) con secret configurato, ma header mancante
CRON_SECRET=testcron123  # (settalo in .env.local e riavvia dev)
curl -i http://localhost:3000/api/cron/auto-archive
# Atteso: HTTP/1.1 401 Unauthorized

# 3) con header corretto
curl -i -H "Authorization: Bearer testcron123" http://localhost:3000/api/cron/auto-archive
# Atteso: HTTP/1.1 200, body con `success: true`, `archived: N`
```

**Regressione da evitare**: nessun errore 500 e il cron deve continuare a archiviare effettivamente i task quando autorizzato. Controlla nei log del dev server che NON compaiano più `console.error`, ma `[Santini] ERROR ...`.

## 3) Debug endpoint (gate ambiente)

In dev (`NODE_ENV=development`) **tutti gli 8 endpoint devono restare accessibili senza secret**. La chiusura 404 scatta solo in produzione.

```bash
curl -i http://localhost:3000/api/debug/basic          # Atteso: 200
curl -i http://localhost:3000/api/debug/vercel-env     # Atteso: 200
curl -i http://localhost:3000/api/debug/site-lookup?subdomain=santini   # Atteso: 200
curl -i http://localhost:3000/api/debug/kanbans        # Atteso: 200
curl -i http://localhost:3000/api/debug/database-tables   # Atteso: 200
curl -i http://localhost:3000/api/debug/user-context   # Atteso: 200
curl -i http://localhost:3000/api/debug/site-navigation?domain=santini   # Atteso: 200
curl -i http://localhost:3000/api/debug/site-flow?domain=santini   # Atteso: 200
```

Per **simulare il comportamento produzione** in locale (opzionale):

```bash
NODE_ENV=production DEBUG_API_SECRET=testdbg123 npm run build && \
  NODE_ENV=production DEBUG_API_SECRET=testdbg123 npm run start

# In un altro terminale:
curl -i http://localhost:3000/api/debug/basic                         # Atteso: 404
curl -i http://localhost:3000/api/debug/basic?secret=testdbg123       # Atteso: 200
curl -i -H "Authorization: Bearer testdbg123" http://localhost:3000/api/debug/basic   # Atteso: 200
```

## 4) Persist key TanStack Query

1. Apri `http://localhost:3000` nel browser, fai login e naviga un paio di pagine.
2. Apri **DevTools → Application → Local Storage → http://localhost:3000**.
3. Verifica che compaia la chiave `matris-query-cache-v2`. Non deve esistere `matris-query-cache` senza `-v2`.
4. Esegui un **logout**. Ricarica la pagina login.
5. Torna a Local Storage: `matris-query-cache-v2` **non deve più esserci** (pulita da `clearPersistentCache`).

Se prima del fix vedevi chiavi orfane, ora non ne restano.

## 5) Move kanban task (logger al posto di console.error)

1. Entra in un sito con kanban e task esistenti (es. `sites/santini/kanban`).
2. Sposta una card in un'altra colonna e verifica che funzioni.
3. Nei log del dev server (`npm run dev`), ora eventuali errori interni mostrano prefisso `[Santini] ERROR` invece di `console.error` nudo. In operazioni normali non dovrebbe esserci nessun errore.

## 6) Migration `ipg` (SOLO se applicata al DB)

La migration è in `supabase/migrations/20260418090000_add_ipg_to_attendance_checks.sql` ma **non è stata ancora applicata**. Per testarla localmente:

```bash
# Se usi Supabase CLI locale con progetto linkato:
supabase db push

# Alternativa manuale via SQL Editor Supabase Dashboard:
# apri il file .sql e copia il BEGIN ... COMMIT
```

Dopo aver applicato:

1. Entra nella pagina Presenze di un sito.
2. Prova a impostare lo stato `IPG` su un giorno per un utente.
3. Atteso: salvataggio OK, nessun errore Postgres `violates check constraint`.
4. Verifica lo stesso per richiesta ferie con `leave_type = 'ipg'`.

**Rollback** se qualcosa va storto:

```sql
BEGIN;
ALTER TABLE attendance_entries DROP CONSTRAINT attendance_entries_status_check;
ALTER TABLE attendance_entries ADD CONSTRAINT attendance_entries_status_check
  CHECK (status IN ('presente','vacanze','malattia','infortunio','smart_working','formazione','assenza_privata'));
ALTER TABLE leave_requests DROP CONSTRAINT leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('vacanze','malattia','infortunio','smart_working','formazione','assenza_privata'));
COMMIT;
```

## 7) Smoke dashboard

Dopo tutti i test precedenti:

1. Apri `sites/santini/dashboard` (o sito di riferimento).
2. Verifica che KPI, Pipeline, mappa cantieri, Kanban navigazione funzionino normalmente. Nessuna regressione UI.

## Esito atteso

Tutte le voci [ ] sopra passano → sei pronto per push + preview Vercel.
Se anche una sola fallisce → fermati e segnalalo.
