# Installation date timezone issue
_Exported on 17/04/2026 at 1:36:40 CEST from Cursor (3.1.15)_

---

**User**

Nella versione in produzione, quando salvo la data di posa di un progetto all'interno della schermata progetto e clicco salva sulla card del progetto, mi va indietro di un giorno dovuto al fuso orario dei server in America presumo. Come possiamo correggere la cosa? Fammi delle proposte prima di agire.

---

**Cursor**

Sto verificando dove viene serializzata e salvata la `data di posa`, così ti propongo soluzioni concrete basate sul codice reale prima di toccare nulla.

Ho individuato i punti rilevanti del form progetto; adesso controllo come quella data viene trasformata prima del salvataggio e poi rimessa in pagina, che è il punto tipico in cui nasce lo slittamento di un giorno.

La causa si sta chiarendo: il form usa un `Date` del browser, ma passando dal server action probabilmente viene serializzato in ISO UTC e lì il parser prende il giorno già “spostato”, quindi il problema nasce prima ancora del database.

Ho trovato anche che il database oggi tratta questi campi come `timestamp` e non `date`, quindi oltre al fix immediato c’è anche un miglioramento strutturale possibile per evitare che il problema riemerga in altri punti dell’app.

Ho controllato il flusso e la causa piu probabile e` questa: il date picker mette nel form un oggetto `Date`, il form lo passa cosi al server action, e poi il salvataggio lo trasforma in stringa usando il timezone del server. In locale non si vede, in produzione si`, perche` il server non e` in Europa.

```305:312:app/sites/[domain]/projects/editForm.tsx
const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
  const dataWithKanban = {
    ...d,
    kanbanId: selectedKanbanId,
    kanbanColumnId: selectedColumnId,
  };

  const response = await editItem(dataWithKanban, resource?.id, domain);
```

```44:49:lib/utils.ts
export function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return formatLocalDate(value);
  }
```

In piu, oggi `deliveryDate` nel database e` definita come `timestamp without time zone`, che per un campo "solo data" non aiuta.

```786:786:supabase/migrations/202507101310_schema_progetto_a.sql
"deliveryDate" timestamp(6) without time zone,
```

Le proposte che vedo sono queste:

1. `Hotfix rapido`
Salvare le `Date` usando sempre il timezone business dell'app, per esempio `Europe/Zurich`, dentro `toDateString()`.
Pro: patch piccola e veloce.
Contro: risolve bene solo se tutti i siti lavorano sempre nello stesso fuso.

2. `Fix robusto consigliato`
Per campi come `data di posa` e `termine_produzione`, non mandare mai un oggetto `Date` al server: dal client inviare sempre una stringa `YYYY-MM-DD`, e lato server salvarla tale e quale.
Pro: indipendente dal server, dal deploy e dal timezone.
Contro: va toccato qualche punto in piu` (`editForm`, `createForm`, modale kanban, salvataggi inline).

3. `Fix strutturale`
Cambiare in DB i campi data-only da `timestamp` a `date`.
Pro: modello dati corretto, meno rischio che il bug ricompaia.
Contro: serve migration e un piccolo audit dei punti che leggono/scrivono quei campi.

La mia raccomandazione e`:
- fare subito la `2`
- valutare insieme la `3` nello stesso intervento o subito dopo
- usare la `1` solo se vuoi un hotfix velocissimo

Se vuoi, nel prossimo passo ti preparo un piano di intervento molto concreto per la soluzione `2 + 3`, con i file esatti da toccare e il rischio per ciascun punto, senza ancora applicare modifiche.

---

**User**

Vai con la 1.

---

**Cursor**

Sto applicando l’hotfix sul punto centrale di serializzazione della data, cosi` correggiamo il salvataggio senza toccare ancora i form o il database.Sto modificando `lib/utils.ts`: il fix sara` centralizzato in `toDateString()`, forzando la conversione delle date nel timezone dell’app invece di usare quello del server.

---

**User**

continua

---

**Cursor**

Sto verificando che l’hotfix non introduca errori e che copra davvero i salvataggi dei progetti anche dalla modale kanban e dagli aggiornamenti API che passano da `toDateString()`.

Il fix e` pulito e senza errori lint. Sto valutando un piccolo test di regressione, cosi` il bug del giorno spostato non ricapita alla prossima modifica sulle date.

Vedo un buon punto per il test: simulare un `Date` che arriva al server gia` in UTC e verificare che il payload verso Supabase resti sul giorno corretto europeo.

Sto aggiungendo un test mirato sul caso reale: una `Date` che arriva in UTC dal client ma deve essere salvata come giorno europeo corretto.

Sto eseguendo il test mirato per confermare che il salvataggio mandi davvero `2026-03-20` e non il giorno precedente.

Il test completo ha evidenziato un problema gia` presente nei mock di quel file: alcune prove entrano in un ramo `order()` non coperto. Per isolare il nostro fix, sto rendendo il nuovo test indipendente da quel ramo e poi rilancio solo quello.

Rilancio solo il test nuovo, cosi` validiamo il fix reale senza farci bloccare da test legacy non correlati.

Il fix e` confermato dal test mirato. Faccio solo un ultimo controllo statico sui file toccati e poi ti riassumo impatto e limite di questa soluzione 1.

Applicato l’hotfix della soluzione `1` in `lib/utils.ts`: ora `toDateString()` non usa piu` implicitamente il timezone del server, ma converte sempre le `Date` nel timezone applicativo `Europe/Zurich` (o `NEXT_PUBLIC_TIMEZONE` se configurato). Questo copre il salvataggio della `data di posa` nei flussi che gia` passano da `toDateString()`, inclusi `projects/edit-item.action.ts`, `projects/create-item.action.ts` e gli update API kanban.

Ho aggiunto anche un test di regressione in `__tests__/projects/edit-item.test.ts` per il caso reale del giorno che slitta in UTC. Il test mirato passa.

Verifica eseguita:
- `ReadLints` sui file modificati: nessun errore
- test mirato: `npm test -- __tests__/projects/edit-item.test.ts -t "should preserve the business date when deliveryDate is serialized in UTC"` passato

Nota importante: eseguendo l’intero file `__tests__/projects/edit-item.test.ts` emergono alcuni test gia` fragili/non aggiornati nei mock del ramo `.order()`. Non li ho toccati perche` non sono legati a questo fix.

Prossimo passo naturale: provare in staging/produzione a salvare una `data di posa` dal modal progetto e verificare che la card resti sullo stesso giorno. Se vuoi, posso anche controllare se ci sono altri salvataggi data fuori da `toDateString()` che meritano lo stesso trattamento.

---

**User**

Nella selezione della data di Posa e della data di produzione con tutte le tabelle o Caban o schede progetto disabilita la selezione dei giorni sabato e domenica.

---

**Cursor**

Sto cercando tutti i punti in cui `data di posa` e `termine di produzione` sono selezionabili, cosi` applico il blocco di sabato e domenica in modo coerente tra tabella, kanban e schede progetto.

Ho trovato anche altri due punti dove si selezionano queste stesse date fuori dalla scheda classica: quick add e wizard di completamento. Li includo per non lasciare buchi nell’esperienza.

Adesso preparo un helper unico per il weekend e lo collego solo ai picker di `deliveryDate` e `termine_produzione`, senza toccare gli altri calendari dell’app.

Sto facendo le modifiche file per file: helper condiviso, poi i picker dei form progetto/kanban, poi la tabella editabile.

Sto facendo un controllo finale per assicurarmi di non aver lasciato un picker progetto/kanban scoperto.

Ho disabilitato sabato e domenica nella selezione di `data di posa` e `termine_produzione` nei punti progetto principali:

- `app/sites/[domain]/projects/createForm.tsx`
- `app/sites/[domain]/projects/editForm.tsx`
- `components/kanbans/editKanbanTask.tsx`
- `components/kanbans/DraftCompletionWizard.tsx`
- `app/sites/[domain]/projects/columns.tsx` tramite `components/table/editable-date-cell.tsx` per l’editing inline in tabella

Per farlo ho aggiunto il helper `isWeekend()` in `lib/utils.ts` e l’ho collegato solo ai picker di queste date, senza bloccare gli altri calendari dell’app. Ho anche verificato i file modificati con il lint: nessun errore. Non ho eseguito test UI end-to-end, quindi il prossimo controllo utile e` provare da interfaccia tabella, modale kanban e scheda progetto che sabato/domenica risultino non selezionabili.

