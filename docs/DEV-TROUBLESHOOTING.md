# FDM - Dev troubleshooting

Raccolta di soluzioni rapide ai problemi ricorrenti di sviluppo locale e
di allineamento tra ambiente locale e online.

## 1. Porte dev occupate (3000/3001)

Next dev usa 3000 di default. Se e gia in uso:

```bash
lsof -ti tcp:3000 | xargs kill -9 || true
lsof -ti tcp:3001 | xargs kill -9 || true
```

In caso di shell con sandbox che blocca `kill`, aprire un terminale normale
(fuori Cursor) e rieseguire.

## 2. Cache Next e hydration stranezze

```bash
rm -rf .next
npm run build
npm run dev
```

Se persistono errori di hydration su componenti che usano `localStorage`:
verificare che i valori iniziali siano coerenti con SSR (usare
`useEffect` per leggere dal localStorage invece che nel render).

## 3. "Modifiche non visibili online"

Checklist:

- `git status --short --branch` pulito
- `git log -1 origin/main` al commit atteso
- Deploy provider (Vercel) ha completato il nuovo build
- Env vars `NEXT_PUBLIC_*` allineate
- Hard refresh (Cmd+Shift+R)
- Bottone "Reset preferenze" kanban (per stale localStorage)

## 4. Test jest / ESM

```bash
npm test -- --testPathPattern='<pattern>'
npm run test:coverage
```

Se un test fallisce per import ESM, controllare `jest.config`/`ts-jest` e
prefix del path (`@/` mappato a root).

## 5. Build fallisce per tipi TS

```bash
npx tsc --noEmit
```

Spesso la causa e un campo nuovo in `types/supabase.ts` non allineato con
chiamate in `lib/server-data.ts` o in componenti UI.

## 6. Supabase service client in route API

Se un endpoint fallisce con "auth.uid is null" o "permission denied",
verificare:

- uso di `createServiceClient()` per operazioni server-to-server
- presenza `site_id` nei filtri (`eq("site_id", siteId)`)
- `getSiteContext(req)` richiamato con successo

## 7. Token PAT GitHub

Mai commitarli, mai incollarli in chat pubbliche. In caso di leak:

1. Revocare subito su https://github.com/settings/tokens.
2. Generare nuovo PAT con scope minimo (`repo` solo se serve push).
3. Aggiornare credenziali locali: `git credential-osxkeychain erase`.

## 8. Presenze: migration constraint

Se l'insert presenze fallisce con CHECK constraint diverso:

```sql
ALTER TABLE attendance_entries DROP CONSTRAINT IF EXISTS attendance_entries_status_check;
ALTER TABLE attendance_entries ADD CONSTRAINT attendance_entries_status_check
  CHECK (status IN (
    'presente', 'vacanze', 'malattia', 'infortunio',
    'smart_working', 'formazione', 'assenza_privata'
  ));
```

Applicare in Supabase SQL Editor se la migration aveva
`CREATE TABLE IF NOT EXISTS`.

## 9. Preferenze kanban stantie

Reset rapido in console browser:

```js
Object.keys(localStorage)
  .filter((k) => k.startsWith("isSmall-") || k.startsWith("card-cover-preference-") || k.startsWith("kanban-card-fields-"))
  .forEach((k) => localStorage.removeItem(k));
location.reload();
```

Oppure usare il bottone "Reset preferenze" aggiunto nella toolbar kanban.

## 10. Riferimenti

- `docs/FEATURE-FLAGS.md`
- `docs/RELEASE-CHECKLIST-FDM.md`
- `docs/DATE-HANDLING-FDM.md`
- `docs/SECURITY-PLAYBOOK.md`
