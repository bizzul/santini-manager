# Guida all’uso di Santini Manager  
## Per utenti e amministratori

Questa guida spiega **come usare il programma ogni giorno**: cosa fare passo passo, dove cliccare e cosa aspettarsi.  
È pensata per **utenti** e **amministratori** (user e admin).

---

## 1. Accedere al programma

### Login

1. Apri il sito e vai alla **pagina di accesso** (login).
2. Inserisci **email** e **password**.
3. Clicca **Accedi**.
4. Verrai portato alla pagina **«I tuoi spazi»**.

Se compare *«Il tuo account è stato disattivato»*, l’account è stato bloccato: contatta l’amministratore.

**Password dimenticata?**  
Usa il link *Password dimenticata?* sotto il form: riceverai un’email per reimpostarla.

---

### Scegliere lo spazio di lavoro

Dopo il login vedi **«I tuoi spazi»**: la lista degli spazi (siti) a cui hai accesso.

- Ogni **spazio** è una sorta di “ufficio” separato: clienti, progetti, kanban, ecc. sono diversi per ogni spazio.
- Clicca **«Entra nel tuo spazio»** sulla card dello spazio in cui vuoi lavorare.
- Verrai portato alla **Dashboard** di quello spazio.

Se vedi *«Nessuno spazio assegnato al tuo account»*, non sei ancora stato aggiunto a nessuno spazio: chiedi a un amministratore di assegnarti l’accesso.

Sulla stessa pagina hai:
- **Home**: torna alla home del sito.
- **Amministrazione** (solo amministratori): va all’area Amministrazione.
- **Logout**: esce dall’account.

---

## 2. L’interfaccia quando lavori in uno spazio

Quando sei dentro uno spazio vedi:

- **Barra in alto**  
  - A sinistra: pulsante (☰) per **aprire e chiudere il menu laterale**.
  - Il contenuto della pagina che hai aperto.

- **Menu laterale (sidebar)**  
  - In alto: **nome/logo dello spazio** e un **pulsante +** per la **creazione rapida** (vedi oltre).
  - Sotto: le **voci di menu** (Dashboard, Kanban, Clienti, Ore, Report, ecc.).  
  - Le voci disponibili **dipendono dallo spazio**: il tuo amministratore può attivare o disattivare alcune sezioni.

- **Menu utente** (in basso nel menu laterale)  
  - Cliccando su **nome, email e ruolo** si apre un menu con:
    - **Account**
    - **Notifiche**
    - **Administration** (solo per amministratori): porta all’Amministrazione.
    - **Log out**: esce dall’account.

---

## 3. Creazione rapida (pulsante +)

Accanto al nome dello spazio c’è un **pulsante +**. Cliccandolo si apre un menu **«Creazione rapida»** con:

- **Cliente** – Aggiungi un nuovo cliente.
- **Progetto** – Crea un nuovo progetto.
- **Articolo** – Aggiungi un nuovo articolo al catalogo.
- **Ore** – Registra le ore lavorate.

Scegli una voce: si apre un modulo per compilare i dati. È un modo veloce per creare qualcosa **senza andare nella sezione specifica**.

---

## 4. Cosa puoi fare in base al tuo ruolo

### Se sei **Utente (User)**

- **Dashboard**: la vedi e la usi come gli altri.
- **Kanban**: puoi aprire le board, spostare le card, aprire e modificare le card (se previsto). **Non** puoi creare nuove board Kanban.
- **Collaboratori**: vedi l’elenco dei collaboratori dello spazio; **non** puoi aggiungerli, toglierli o cambiarne i ruoli.
- **Ore**: puoi **inserire e modificare solo le tue ore**. Nei report ore vedi **solo le tue**.
- **Report**: i report disponibili per te (Inventario, Progetti, Errori, Ore, Imballaggio, ecc.) dipendono da come è configurato lo spazio. Nel report Ore vedi solo le tue ore.
- **Clienti, Fornitori, Prodotti, Progetti, Magazzino, Errori, Quality Control, Imballaggio, Calendario, Categorie**: li puoi usare come previsto dalla configurazione (di solito: vedere, aggiungere, modificare, eliminare dove i pulsanti sono presenti).

### Se sei **Amministratore (Admin)**

- Puoi fare **tutto ciò che può fare un utente**.
- **Collaboratori**: puoi **aggiungere, togliere e gestire i collaboratori** dello spazio e i loro ruoli.
- **Ore e report Ore**: vedi e puoi esportare **le ore di tutti i collaboratori**, non solo le tue.
- **Amministrazione**: dal menu utente (voce *Administration* o *Amministrazione*) o dalla pagina «I tuoi spazi» (pulsante **Amministrazione**) puoi entrare in **Amministrazione**. Da lì gestisci:
  - gli **utenti** della tua organizzazione;
  - i **siti** (spazi) della tua organizzazione e le relative impostazioni;
  - la tua **organizzazione** (nome, codice, ecc.).

---

## 5. Come si usa il programma: flussi tipici

### Lavoro di ogni giorno

1. **Accedi** e scegli lo **spazio** dalla pagina «I tuoi spazi».
2. Dalla **Dashboard** hai un riepilogo: offerte, ordini di produzione, ecc.
3. Dal **menu laterale** vai dove ti serve:
   - **Kanban** – per seguire e spostare i lavori (offerte, produzione, ecc.).
   - **Progetti** – per vedere, creare e gestire i progetti.
   - **Ore** – per registrare le ore (o usare il + «Ore» per farlo in fretta).
   - **Clienti, Fornitori, Prodotti, Magazzino** – per anagrafiche e dati di base.

### Kanban (board di lavoro)

- Nel menu **Kanban** si espande l’elenco delle **board** (a volte raggruppate per categoria, es. Ufficio, Produzione).
- Clicca su una board per aprirla.
- La board ha **colonne** (es. Da fare, In corso, Completato) e **card** (le singole commesse/offerte).
- **Spostare una card**: trascinala in un’altra colonna.
- **Aprire o modificare una card**: clicca sulla card; si apre il dettaglio con i campi modificabili.
- **Aggiungere una card**: nella colonna indicata (di solito la prima) c’è un pulsante **+**; cliccandolo compili i dati e la card viene creata.
- Se usi la **Kanban delle offerte**, alcune colonne (es. Trattativa, Vinto, Perso) possono avere azioni specifiche (es. follow-up, passaggio a progetto quando l’offerta è vinta). Le opzioni visibili dipendono da come è configurata la board.

La voce *Crea Kanban* (per creare nuove board) può non essere disponibile: in quel caso la creazione di nuove board è gestita dall’amministratore di sistema.

### Da offerta a progetto

Se la tua azienda usa una **Kanban offerte** e una **Kanban progetti** collegate:

1. Crei o gestisci l’offerta nella **board offerte** (card con cliente, articoli, prezzi, ecc.).
2. Quando l’offerta è **vinta**, la sposti nella colonna dedicata (es. Vinto).
3. Se è stato configurato il passaggio automatico, dalla colonna “Vinto” il sistema può **creare o aggiornare un progetto** nella Kanban di lavoro. In quel caso la nuova card/il progetto comparirà nella board progetti.
4. Da **Progetti** puoi comunque **creare un progetto a mano** (anche da zero) con cliente, articoli, kanban, ecc.

### Registrare le ore

1. Vai in **Ore** dal menu (oppure usa il **+** → **Ore**).
2. Clicca su **Aggiungi rapporto** (o simile).
3. Inserisci:
   - **Data**
   - **Ore** e **minuti**
   - **Progetto** (task) **oppure** attività interna
   - Se richiesto: **ruolo**, **descrizione**, **tipo** (progetto / interno), **pranzo fuori sede**, ecc.
4. Salva.

- **Utenti**: nella lista Ore vedi **solo i tuoi** rapporti; non puoi vedere o modificare quelli degli altri.
- **Admin**: vedi tutti i rapporti dello spazio.

### Segnalare un errore

1. Vai in **Errori** dal menu.
2. Clicca **Aggiungi errore**.
3. Compila: progetto, fornitore, tipo, descrizione, posizione, utente che segnala, ecc. Se previsto, allega **file** (foto, documenti).
4. Salva.

### Imballaggio e Quality Control

- **Imballaggio**  
  - Dalla voce **Imballaggio** vedi l’elenco degli imballaggi per progetto.  
  - Da **Effettua imballaggio** (sotto Report o nella stessa sezione) apri la vista operativa: qui trovi i **lavori da imballare** (progetti non ancora in colonna “Spedito”). Cliccando su un elemento puoi compilare o aggiornare i dati di imballaggio.

- **Quality Control (QC)**  
  - Da **Quality Control** puoi vedere lo stato dei controlli (e, se configurato, i report).  
  - Da **Effettua QC** apri la vista operativa sui **lavori già spediti** da controllare. In base alla schermata puoi aprirli, compilarli e salvarli.

L’ordine tipico in produzione è: **lavoro in corso → Imballaggio → Spedito → QC**.

### Scaricare i report

1. Vai in **Reports** dal menu.
2. Si apre una pagina con diverse **card** (Inventario, Progetti, Ore, Errori, PDF Imballaggio, Report Imballaggio/QC). Quelle visibili dipendono dalla configurazione dello spazio.
3. Per ogni report:
   - **Senza filtri** (es. Inventario, Progetti, Report Imballaggio/QC): clicca **Scarica** per ottenere il file (di solito Excel o PDF).
   - **Con intervallo di date** (Ore, Errori): scegli **data inizio e data fine** (a volte anche fornitore o progetto), poi **Scarica**.
   - **Con scelta progetto** (PDF Imballaggio): scegli il **progetto** dal menu e clicca **Scarica**.

- **Report Ore**: gli **utenti** scaricano solo **le proprie ore**; gli **admin** quelle di **tutti**.

---

## 6. Cambiare spazio o uscire

- **Cambiare spazio**  
  Per passare a un altro spazio devi tornare alla pagina **«I tuoi spazi»** (quella con l’elenco delle card degli spazi). Da lì clicchi **«Entra nel tuo spazio»** sull’altro spazio.  
  Se, lavorando dentro uno spazio, non vedi un link per «I tuoi spazi», puoi usare il **pulsante Indietro** del browser fino ad arrivarci, oppure **tornare alla home** del sito e da lì accedere alla pagina di login o alla selezione spazi, se il sito lo prevede. In alternativa, chiedi all’amministratore come accedere alla pagina di selezione degli spazi (segnalibro o link).

- **Uscire (Logout)**  
  - **Dentro uno spazio**: nel menu laterale, in basso, clicca su **nome/email** e poi **Log out**.  
  - **Nella pagina «I tuoi spazi»**: usa il pulsante **Logout** in alto.

---

## 7. Se sei amministratore: collaboratori e Amministrazione

### Collaboratori (dentro uno spazio)

1. Vai in **Contatti** → **Collaboratori** (o nella voce **Collaboratori** se è in primo piano).
2. Vedi la **tabella** con i collaboratori collegati allo spazio.
3. Puoi:
   - **Aggiungere** un collaboratore (se è già in azienda) o **invitare** qualcuno con una email (se il pulsante/invito è previsto).
   - **Modificare** dati (nome, cognome, ruolo aziendale, ecc.) e **ruoli per lo spazio**.
   - **Rimuovere** un collaboratore dallo spazio.
   - Inviare il **reset della password** (se previsto dall’interfaccia).

Gli **utenti** vedono la stessa lista ma **senza** pulsanti per aggiungere, modificare o rimuovere.

### Amministrazione (fuori dallo spazio)

- **Da dove si entra**:  
  - Dalla pagina **«I tuoi spazi»** → pulsante **Amministrazione** (in alto).  
  - **Dentro uno spazio** → menu utente (clic su nome/email in basso nella sidebar) → **Administration** (o Amministrazione, in base alla versione).

- **Cosa puoi fare**:
  - **Utenti**: gestire gli utenti della tua organizzazione: creare, modificare, disattivare, assegnare a organizzazioni e siti.
  - **Siti**: creare siti, modificarne nome, dominio, impostazioni, moduli attivi, e collegarli alla tua organizzazione. Vedi e gestisci i siti della tua organizzazione (Visit, Settings).
  - **Organizzazione**: gestire i dati della tua organizzazione (nome, codice, ecc.). Dalla dashboard Amministrazione puoi andare velocemente ai siti (Visit, Settings) e alla modifica dell’organizzazione.

---

## 8. Problemi comuni

| Problema | Cosa fare |
|----------|-----------|
| **Non vedo nessuno spazio** nella pagina «I tuoi spazi» | Il tuo account non è ancora collegato a nessuno spazio. Chiedi a un amministratore di **assegnarti l’accesso** a uno spazio. |
| **«Non hai accesso a questo spazio»** (o simile) | Stai provando ad entrare in uno spazio a cui non sei autorizzato. Chiedi all’amministratore di **aggiungerti a quello spazio** (Collaboratori o gestione utenti/siti in Amministrazione). |
| **Errore durante il caricamento dello spazio** | Riprova; se persiste, controlla la connessione e segnala all’amministratore. |
| **Non trovo una sezione** (Ore, Report, Kanban, ecc.) | Le sezioni visibili dipendono da **come è configurato lo spazio**. Se non vedi una voce, può essere disattivata: chiedi all’amministratore. |
| **Nel report Ore vedo solo le mie ore** | Se sei **utente** è normale: il report Ore per gli utenti mostra solo le ore personali. Per vedere tutte le ore serve un ruolo **amministratore**. |
| **Non vedo «Crea Kanban»** | La creazione di nuove board Kanban può essere riservata all’amministratore di sistema. Per una nuova board chiedi all’amministratore. |
| **Account disattivato** | Solo un amministratore può riattivare l’account. Contatta l’amministratore della tua organizzazione. |

---

## 9. Riepilogo per utenti e admin

**Utente (User)**  
- Login → Scegli spazio → Lavori in Dashboard, Kanban, Progetti, Ore (solo le tue), Clienti, Fornitori, Prodotti, Magazzino, Errori, Report, Imballaggio, QC, Calendario, Categorie, come previsto dal menu.  
- Creazione rapida con **+** (Cliente, Progetto, Articolo, Ore).  
- Collaboratori: solo lettura.  
- Report Ore: solo le tue ore.  
- Nessuna Amministrazione, nessuna creazione di nuove Kanban.

**Amministratore (Admin)**  
- Come l’utente, più:  
  - Gestione **Collaboratori** (aggiungi, modifica, togli, ruoli).  
  - Report Ore: **tutti** i collaboratori.  
  - Accesso ad **Amministrazione** (utenti, siti e organizzazione della propria organizzazione).  
  - La creazione di nuove board Kanban può essere gestita dall’amministratore di sistema; se non vedi *Crea Kanban*, chiedi all’amministratore.

---

*Guida basata sul funzionamento attuale di Santini Manager. Se qualcosa nella tua installazione è diverso (nomi di menu, moduli attivi), l’amministratore dello spazio o del sistema può adattare i passaggi alla vostra configurazione.*
