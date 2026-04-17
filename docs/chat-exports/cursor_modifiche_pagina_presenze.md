# Modifiche pagina presenze
_Exported on 17/04/2026 at 1:36:48 CEST from Cursor (3.1.15)_

---

**User**

Nella pagina presenze non visualizzare più gli utenti disabilitati come in questo caso Matteo Paolocci. Non viene inoltre visualizzato uno degli amministratori presenti in database, Nicola Santini. Modifica il colore della leggenda assenza privata in giallo e aggiungi un ulteriore campo chiamato IPG.

---

**Cursor**

Sto verificando come viene costruita la pagina `Presenze` e dove vengono filtrati gli utenti e la leggenda, così posso correggere sia la lista dipendenti sia i colori/campi richiesti.

Ho individuato i file principali: la pagina usa l'endpoint `app/api/sites/[domain]/attendance/route.ts` e i componenti `components/attendance/*`; ora leggo questi punti per capire perché Matteo compare e Nicola no.

Ho trovato un indizio importante: nel progetto gli admin hanno accesso ai siti anche tramite `user_organizations`, non solo tramite `user_sites`. L'endpoint delle presenze invece legge solo `user_sites`, quindi è probabile che per questo Nicola non compaia e che il filtro utenti vada riallineato alla logica già usata altrove.

Sto preparando una modifica mirata all’API delle presenze: includerò gli admin dell’organizzazione, escluderò gli utenti disabilitati e poi estenderò i tipi/stati per `IPG` in modo coerente tra griglia, legenda e richieste.

Sto aggiornando i tipi condivisi degli stati presenze/assenze, così `IPG` diventa disponibile ovunque in modo consistente e la legenda usa il nuovo giallo per `Assenza privata`.

Ho applicato le modifiche principali. Adesso controllo i file toccati per eventuali errori TypeScript/lint e, se serve, sistemo gli ultimi dettagli di typing o formattazione.

Sto rifinendo il layout per il nuovo stato `IPG`, così anche il riepilogo in alto resta allineato senza andare a capo in modo strano sui monitor larghi.

Nella pagina `Presenze` ora gli utenti disabilitati non vengono piu mostrati e gli amministratori dell'organizzazione vengono inclusi anche se non hanno una riga diretta in `user_sites`, quindi il caso `Matteo Paolocci` viene escluso e `Nicola Santini` viene considerato correttamente. Ho fatto questa correzione in `app/api/sites/[domain]/attendance/route.ts`.

Ho anche aggiornato gli stati condivisi in `components/attendance/attendance-types.ts`: `Assenza privata` adesso usa il giallo nella legenda/statistiche e ho aggiunto il nuovo stato `IPG`, disponibile nella griglia presenze, nella legenda, nelle card statistiche e anche tra i tipi di richiesta assenza. Ho adeguato anche `app/api/sites/[domain]/leave-requests/route.ts` e il layout di `components/attendance/AttendanceStats.tsx` per gestire l'ottava card.

Controllo lint sui file modificati: nessun errore. Non ho eseguito test end-to-end nel browser. Se vuoi, posso anche assegnare a `IPG` un colore diverso da quello che ho scelto adesso.

---

**User**

Devo fare l'aggiornamento in db?

---

**Cursor**

Controllo se `attendance_entries.status` e `leave_requests.leave_type` hanno vincoli o enum nel database, così ti dico con precisione se serve una migrazione.

Ho trovato le migration del modulo presenze; adesso verifico se il DB impone ancora un elenco chiuso di valori, perché in quel caso per `IPG` serve davvero un update SQL.

Sì, ma solo per `IPG`.

Per le correzioni su utenti disabilitati e admin mancanti non serve nessun aggiornamento DB: sono modifiche lato applicazione.

Per `IPG` invece sì, perché nel database ci sono ancora check constraint che accettano solo i valori vecchi per:

- `attendance_entries.status`
- `leave_requests.leave_type`

Quindi la UI ora mostra `IPG`, ma al salvataggio il DB lo rifiuterebbe finché non aggiorni quei vincoli. In più, quando una richiesta ferie viene approvata, `leave_type` viene copiato in `attendance_entries`, quindi vanno aggiornate entrambe le tabelle.

Puoi applicare una migration tipo questa:

```sql
ALTER TABLE attendance_entries
DROP CONSTRAINT IF EXISTS attendance_entries_status_check;

ALTER TABLE attendance_entries
ADD CONSTRAINT attendance_entries_status_check
CHECK (status IN (
  'presente',
  'vacanze',
  'malattia',
  'infortunio',
  'smart_working',
  'formazione',
  'assenza_privata',
  'ipg'
));

ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_leave_type_check
CHECK (leave_type IN (
  'vacanze',
  'malattia',
  'infortunio',
  'smart_working',
  'formazione',
  'assenza_privata',
  'ipg'
));
```

Se vuoi, posso crearti subito il file di migration in `supabase/migrations/`.

