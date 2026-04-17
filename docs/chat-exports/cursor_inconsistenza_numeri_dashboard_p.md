# Inconsistenza numeri dashboard produzione
_Exported on 17/04/2026 at 1:37:24 CEST from Cursor (3.1.15)_

---

**User**

nella dashboard produzione i numeri superiori nelle card sono corretti, mentre quelli nel grafico no.

---

**Cursor**

Controllo dove vengono calcolati i valori della dashboard produzione, così confronto il conteggio delle card con quello del grafico e individuo la divergenza.

Ho trovato i componenti giusti. Adesso leggo il file pagina e i due widget per verificare se il grafico usa una metrica diversa rispetto alle card.

Sto verificando l’aggregazione lato server: se le card e il grafico partono da query o filtri diversi, il bug sarà lì più che nel rendering.

Ho già trovato una possibile causa: le card contano i task per reparto, mentre il grafico ricostruisce i conteggi per famiglia prodotto da un campo relazionale separato. Prima di toccare il codice voglio verificare con i dati reali quale categoria sta venendo contata male.

Ho trovato un indizio concreto: in altri punti del progetto la categoria prodotto viene normalizzata quando Supabase la restituisce come array, mentre qui no. Se questa dashboard usa il valore grezzo, alcune pratiche finiscono aggregate male.

La somma del grafico torna, quindi il problema non sembra nel numero totale di task ma in come vengono assegnati alle categorie del grafico. Verifico se c’è un disallineamento tra etichetta mostrata e categoria effettiva letta dai dati.

Per capire se il bug è di codice o di dati reali, faccio una verifica diretta sul database locale del progetto e confronto il raggruppamento usato dal grafico con quello atteso.

La lettura diretta del file env in shell è inciampata nel formato locale, quindi uso le stesse credenziali già caricate dal progetto per fare la query senza toccare nulla dell’app.

La connessione ai dati è valida; adesso sto interrogando gli stessi record usati dalla dashboard per vedere quale campo del prodotto sposta i conteggi del grafico.

