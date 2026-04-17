# FDM - Date handling guidelines

Riferimento rapido su come gestire date e orari in tutto il progetto FDM
per evitare i bug ricorrenti di "data scalata di un giorno" in produzione.

## Principi
1. Per date "calendario" (senza orario) conservare SEMPRE stringhe
   `YYYY-MM-DD` (mai `Date` serializzato con `toISOString`).
2. Il timezone applicativo e `APP_TIMEZONE` (default `Europe/Zurich`) letto
   da `NEXT_PUBLIC_TIMEZONE`. Tutti gli ambienti devono usarlo.
3. In scrittura DB usare sempre `toDateString(value)` da `lib/utils.ts`.
4. In lettura/visualizzazione usare `parseLocalDate(str)` e non
   `new Date(str)` per stringhe date-only.
5. In formattazione utente usare `DateManager.formatEUDate` /
   `DateManager.formatEUDateTime` (`package/utils/dates/date-manager.ts`).

## Helper canonici (gia presenti nel repo)

| Helper | File | Scopo |
|---|---|---|
| `formatLocalDate(date)` | `lib/utils.ts` | Serializza Date -> `YYYY-MM-DD` locale |
| `parseLocalDate(str)` | `lib/utils.ts` | Parse `YYYY-MM-DD`/ISO come locale |
| `toDateString(value)` | `lib/utils.ts` | Normalizza Date/string -> `YYYY-MM-DD` via `APP_TIMEZONE` |
| `startOfLocalDay(date)` | `lib/utils.ts` | Start-of-day locale |
| `endOfLocalDay(date)` | `lib/utils.ts` | End-of-day locale |
| `DateManager.formatEUDate` | `package/utils/dates/date-manager.ts` | Formattazione IT |
| `DateManager.formatEUDateTime` | `package/utils/dates/date-manager.ts` | Formattazione IT + ora |

## Do

- `const saved = toDateString(form.deliveryDate);` prima di un INSERT/UPDATE.
- `const d = parseLocalDate(row.deliveryDate);` per aprire date-picker o
  calcoli giorni.
- `formatInTimeZone(value, APP_TIMEZONE, "yyyy-MM-dd")` tramite `date-fns-tz`
  quando serve esplicitare il timezone.
- Per orari (`HH:mm`): mantenere come stringhe, combinare con la data solo
  quando serve un timestamp (es. cron/timeline).

## Don't

- `new Date("2026-04-10")` in codice server: su Node viene interpretato UTC
  e causa `-1 giorno` in timezone positivi. Usare `parseLocalDate`.
- `date.toISOString().split("T")[0]`: usa UTC, NON il timezone utente.
- Mescolare Date e stringhe nella stessa collezione senza normalizzare.
- Affidarsi a `Date.parse` per valori utente (accetta troppe forme).

## Pattern test (suggerito)

```ts
import { toDateString, parseLocalDate } from "@/lib/utils";

it("toDateString stable across summer/winter time", () => {
  expect(toDateString("2026-03-28")).toBe("2026-03-28");
  expect(toDateString("2026-10-25")).toBe("2026-10-25");
});

it("parseLocalDate returns local midnight", () => {
  const d = parseLocalDate("2026-04-10");
  expect(d.getFullYear()).toBe(2026);
  expect(d.getMonth()).toBe(3);
  expect(d.getDate()).toBe(10);
});
```

## Check integrazione Supabase

- Colonne "calendario" in tabella `Task` (`deliveryDate`,
  `produzione_data_inizio`, `posa_data_fine`, ecc.) devono essere `date`,
  non `timestamp`.
- Se si trova `timestamp without time zone` su campi calendariali, aprire
  una migration che converte in `date` e aggiornare `toDateString` di
  conseguenza.

## Smoke check rapido

Prima di pubblicare una release che tocca date:

- [ ] `npm test` verde sui test che includono `parseLocalDate`, `toDateString`.
- [ ] Una card di posa creata alle 23:30 locali mostra la stessa data il
      giorno dopo alle 8:00.
- [ ] Nessun `Date.toISOString()` nuovo introdotto per date-only
      (grep: `rg "toISOString\(\)\.split\(\"T\"\)\[0\]"`).
