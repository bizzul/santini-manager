# Foglio di routine operativa — Falegnameria Santini (FDM)

Documento operativo (non manuale funzionalità). Fonte: codice FDM al 2026-07-22.  
Percorsi: `/sites/<dominio>/…`. Menu laterale = voci i18n IT (`lib/i18n/messages/it.ts`).

**Orari** (es. «entro le 09:00») = proposta di disciplina operativa aziendale: **non** sono codificati nel software.  
**Colonne Kanban** citate con titoli IT di riferimento (struttura tipica FDM: seed Scherman; Estrella dichiara di rispecchiare le Kanban principali Santini). I titoli **esatti** delle board di produzione Santini **non** sono nel repository → verificare a schermo e aggiornare questo foglio.

---

## Premessa — ruoli nel codice vs ruoli di questo foglio

| Ruolo in questo foglio | Nel codice |
|---|---|
| Direttore, Amministrazione, Ufficio tecnico, Capo produzione, Posa, Service | **Non** esistono come `User.role`. Sono ruoli operativi aziendali (`company_role` = testo libero). |
| Accesso reale | `User.role` ∈ `user` \| `admin` \| `superadmin` + moduli sito + `user_module_permissions` / `user_kanban_permissions`. |
| Gate dashboard | Chi ha modulo `dashboard` (o è admin/superadmin) vede **tutte** le tab dashboard. **Nessun** filtro per area/ruolo operativo. |
| Transizioni Kanban | Drag & drop; conferma obbligatoria su colonne `won` / `lost` / `production` / `invoicing`. **Nessun** ACL per ruolo sulla mossa. |

Label sistema (UI Collaboratori): **Utente** / **Amministratore** / **Super Admin**.

---

## Ricognizione sintetica (FASE 1)

### Dashboard (tab sticky)

| Tab UI | Path | Titolo pagina |
|---|---|---|
| Overview | `/dashboard` | Dashboard - Overview |
| Vendita | `/dashboard/vendita` | Dashboard - Vendita |
| AVOR | `/dashboard/avor` | Dashboard – AVOR |
| Produzione | `/dashboard/produzione` | Dashboard - Produzione |
| Fatturazione | `/dashboard/fatturazione` | Dashboard – Fatturazione |
| Interni | `/dashboard/interni` | Dashboard – Lavori Interni |
| Inventario | `/dashboard/inventario` | Dashboard - Inventario |
| Prodotti | `/dashboard/prodotti` | Dashboard - Prodotti |
| Integrazione | `/dashboard/integration` | Integrazione Dashboard |
| Forecast (solo sidebar) | `/dashboard/forecast` | richiede modulo `dashboard-forecast` |

**Non esistono** route `/dashboard/posa`, `/dashboard/service`, né dashboard «Amministrazione» / «Ufficio tecnico» dedicate (AVOR ≈ ufficio tecnico).

### Menu operativo rilevante

| Voce sidebar | Path / azione |
|---|---|
| Dashboard → Overview / Forecast | vedi sopra |
| Kanban → Kanban Ufficio | `/kanban?type=office` |
| Kanban → Kanban Produzione | `/kanban?type=production` |
| Calendari → Produzione | `/calendar` → UI **Calendario Produzione** |
| Calendari → Posa | `/calendar-installation` → UI **Calendario Posa** |
| Calendari → Service | `/calendar-service` → UI **Calendario Service** |
| Ore | `/timetracking` — pulsante **Aggiungi report ore** / dialog **Nuovo report ore** |
| Presenze | `/attendance` — sezione **Richieste in attesa** |
| Magazzino / Fabbrica / Errori / … | moduli se abilitati |

### Pipeline record (stato = colonna Kanban)

Flusso tipico (riferimento IT):

| Dominio | Board (identifier tipico) | Colonne (titoli UI tipici) | Tipo speciale |
|---|---|---|---|
| Offerte | `0_offerte` | To do → Elaborazione → Inviata → Trattativa → **Vinta** / **Persa** | `won` / `lost` |
| AVOR | `1_avor` | To Do → Rilievo → Elaborazione → **Produzione** | ultima = `production` |
| Produzione | board per reparto | … → colonna fatturazione (es. **Spedito** / **Ultimato**) | `invoicing` |
| Posa (se board presente) | `5_posa` | To Do → Pian → Esecuzione → **Collaudo** | Collaudo = `invoicing` |
| Service | `service` | To Do → Pianificato → Esecuzione → Ultimato | tutte `normal` |
| Fatture | `fatture` (**Fatture OUT**) | To Do → Inviata → Pagata | — |

Dialog di conferma (testo esatto UI):

- **Conferma Offerta Vinta** / **Conferma Offerta Persa** (motivazione obbligatoria: Prezzo, Tempi di fornitura, Cantiere fermo, Altro)
- **Conferma Invio a Produzione**
- **Conferma Fatturazione**
- **Conferma Spostamento Imballaggio** (se colonna IMBALL*)
- Bozza offerta: **Completa e Sposta**
- Follow-up: **Follow-up Offerta** → **Salva** / **Salva e Sposta**

### Contatori / alert (label esatte)

| Dove | Label |
|---|---|
| Overview KPI | Offerte (Inviate, In trattativa); AVOR (Vinte, Progetti); Produzione (In produzione, Posa); Fatture (Da inviare, Inviate) |
| Vendita – Stato Offerte | To Do, Inviate, In Trattativa, Vinte, Perse (+ sotto To Do: In ritardo, Da fare oggi, Non scadute) |
| Vendita – Alert Offerte | messaggi tipo «… in scadenza oggi/domani», «scaduta da Ng», «attende risposta…» |
| AVOR – Alert & Criticità | ritardo / ferma da N giorni / senza categoria articoli |
| Fatturazione – Stato Fatture | Da Emettere, Emesse, Scadute, Pagate |
| Produzione – Stato Produzione | una card per **nome kanban** (reparto), non per colonna |
| Produzione – Commesse calendari | Settimana scorsa / Questa settimana / Prossima settimana; breakdown **P** / **I** / **S** |
| Calendario | pannello **Da definire**; badge **N conflitti** / **N con orario da definire** |
| Kanban card | badge consegna `Oggi`, `+Ng`, `-Ng`; follow-up offerte (`Ricontatta oggi`, `Ricontatto scaduto…`, …) |

**Notifiche:** non c’è centro notifiche operativo nel layout siti (`AppSidebar`). La campanella legacy e la voce menu **Notifiche** sono stub/legacy. Usa i pannelli dashboard e i badge sulle card.

---

## DA CHIARIRE

1. Titoli **esatti** delle board/colonne produzione Santini live (nessun `seed-santini` nel repo).
2. Se Santini ha la board **5. Posa** o usa solo **Calendario Posa**.
3. Mapping `company_role` → permessi moduli/kanban assegnati agli account Santini.
4. `production_routing` e `target_invoice_kanban_id` configurati sul sito (senza di essi le conferme speciali non completano il passaggio cross-board).
5. Orari fissi di disciplina (09:00, chiusura, …): da validare con direzione.
6. Chi, in azienda, opera sulla board **Offerte** (Direttore vs commerciale non in elenco ruoli).
7. Campanella notifiche: product intent vs legacy.
8. Alert Overview «ferma in prod. (Materiale mancante)»: testo hardcoded su `deliveryDate` scaduta, **non** legato a magazzino.
9. Alert inventorio `low_stock` e prodotti `missing_price`: tipizzati ma non generati / commentati.
10. Filtro periodo Fatturazione: supportato in query, componente UI **non montato**.

---

# 1. DIRETTORE

**Schermate tipiche:** Dashboard Overview (+ Forecast se abilitato), Vendita, Produzione, Fatturazione; lettura Kanban Ufficio/Produzione. Account di solito `admin`.

### 1.1 Apertura giornata (primi 10 minuti)

1. Accedi → **I tuoi spazi** → entra nello spazio Santini → **Dashboard - Overview**.
2. Guarda i KPI: **Offerte** (`Inviate`, `In trattativa`), **AVOR** (`Vinte`, `Progetti`), **Produzione** (`In produzione`, `Posa`), **Fatture** (`Da inviare`, `Inviate`).  
   - Se ok: passa al passo 3.  
   - Se un contatore è anomalo rispetto al carico atteso: apri la tab corrispondente (Vendita / AVOR / Produzione / Fatturazione) e apri la lista/alert; avvisa il ruolo owner (Amministrazione / Ufficio tecnico / Capo produzione).
3. Scorri **Ultime notifiche**.  
   - Se riga con `deliveryDate` scaduta (testo «ferma in prod…» o titolo pratica): apri codice in Kanban Produzione / AVOR; assegna follow-up al Capo produzione o Ufficio tecnico.  
   - Se «Nessuna notifica disponibile»: passa oltre.
4. Apri **Dashboard - Vendita** → pannello **Alert Offerte**.  
   - Se alert `high` (scadenza oggi/domani/scaduta): apri Kanban **Offerte** (`/kanban?name=0_offerte` o da Kanban Ufficio) e tratta la card (sposta in **Trattativa** / apri **Follow-up Offerta**, oppure **Vinta**/**Persa** con conferma).  
   - Se «Nessun alert attivo»: ok.
5. Apri **Dashboard – Fatturazione** → **Stato Fatture**.  
   - Se **Scadute** > 0: apri Kanban **Fatture OUT**; per ogni card in **Inviata** con badge ritardo, avvisa Amministrazione.  
   - Se **Scadute** = 0: ok.
6. Apri **Dashboard - Produzione** → **Commesse calendari: riepilogo 3 settimane** (colonne **Questa settimana** / **Prossima settimana**, breakdown **P**/**I**/**S**).  
   - Se **I** o **S** sparati rispetto a **P**: avvisa Posa / Service.  
   - Se bilanciato: ok.

### 1.2 Durante la giornata — routine ricorrenti

| Quando | Sequenza | Chiusura |
|---|---|---|
| Dopo ogni riunione commerciale / decisione offerta | Kanban **Offerte** → sposta in **Vinta** o **Persa** → conferma dialog → verifica comparsa pratica in **AVOR** (se Vinta) | Card in **Vinta** (archivio automatico se configurato) o **Persa** con motivazione |
| A metà giornata (proposta 12:30) | Riapri Overview KPI + **Alert Offerte** | Nessun alert `high` non assegnato |
| Su chiamata da Capo produzione / UT | Apri card citata in Kanban; non lasciare stato ambiguo: o decidi (Vinta/Persa / priorità) o annota in card e assegna owner | Owner e colonna aggiornati |

### 1.3 Chiusura giornata (ultimi 10 minuti)

1. Overview: nessun KPI «a zero inatteso» senza nota.
2. Vendita: **Alert Offerte** senza scadenze odierne non gestite.
3. Fatturazione: **Scadute** note ad Amministrazione (non lasciarle scoperte).
4. Non lasciare offerte in **Elaborazione** senza responsabile (visibili anche nel bucket **To Do** della dashboard Vendita).

### 1.4 Settimanale / mensile

| Cadenza | Azione |
|---|---|
| Lunedì mattina | Overview + Produzione (3 settimane) + Forecast (se modulo on): confronta carico **P/I/S** |
| Fine mese | Dashboard Fatturazione (**Pagate** vs **Emesse**/**Scadute**) + Report Ore (admin: tutti) se serve consuntivo |

### 1.5 Trigger evento

| Quando succede X | Fai Y |
|---|---|
| Cliente chiama su offerta aperta | Apri Kanban **Offerte** → card → **Follow-up Offerta** (Data Contatto, Tipo Contatto) → **Salva** o **Salva e Sposta** in **Trattativa** |
| Offerta persa | Sposta in **Persa** → **Conferma Offerta Persa** → scegli motivazione → **Conferma** |
| Offerta vinta | Sposta in **Vinta** → **Conferma Offerta Vinta** → **Conferma** → verifica card in **AVOR** |
| Blocco materiale segnalato a voce | Apri pratica in Produzione/AVOR; **non** fidarti del testo Overview «Materiale mancante» come prova magazzino → verifica **Magazzino** / avvisa Capo produzione |
| Conflitto calendario posa/service | Apri calendario relativo → risolvi **conflitti** / **Da definire** con il ruolo owner |

### 1.6 Regole d’oro

1. Ogni offerta scaduta oggi ha un follow-up o uno stato **Vinta**/**Persa** entro sera.
2. Non spostare in **Vinta** senza conferma dialog (crea copia AVOR).
3. Le **Scadute** fatture non restano senza owner Amministrazione.
4. Priorità carico: leggi **P/I/S** su Produzione prima di promettere date.
5. Non usare la voce menu **Notifiche** come inbox (stub).

---

# 2. AMMINISTRAZIONE

**Schermate tipiche:** Dashboard Fatturazione, Kanban **Fatture OUT**, Clienti, Ore/Report Ore, Presenze, Collaboratori (se `admin`).

### 2.1 Apertura giornata

1. Entra nello spazio → **Dashboard – Fatturazione**.
2. Leggi **Stato Fatture**: **Da Emettere**, **Emesse**, **Scadute**, **Pagate**.  
   - Se **Da Emettere** > 0: apri Kanban **Fatture OUT** (`identifier` tipico `fatture`) colonna **To Do**; per ogni card verifica dati e prepara emissione.  
   - Se = 0: passa al passo 3.
3. Se **Scadute** > 0: apri le card in **Inviata** con `deliveryDate` passata; contatta cliente / aggiorna stato quando pagato → sposta in **Pagata**.  
   - Se = 0: ok.
4. Controlla grafico **Aging fatture** (bucket `0-30`, `31-60`, `61-90`, `90+`): se pezzi in `90+`, priorità solleciti.
5. Apri **Presenze** → **Richieste in attesa**.  
   - Se count > 0: evadi o assegna.  
   - Se 0: ok.
6. (Se account `admin`) Controlla che i collaboratori operativi abbiano accesso moduli/kanban corretti in **Collaboratori** — solo se hai avuto segnalazioni di «non vedo la board».

### 2.2 Durante la giornata

| Quando | Sequenza | Chiusura |
|---|---|---|
| Arriva card da produzione/posa via **Conferma Fatturazione** | Kanban **Fatture OUT** → **To Do** → completa dati → sposta in **Inviata** | Card in **Inviata**, `deliveryDate` valorizzata se usate scadenze |
| Pagamento ricevuto | Sposta card **Inviata** → **Pagata** | Contatore **Pagate** aggiornato |
| Nuovo cliente da offerta | **Clienti** oppure Creazione rapida **+** → **Cliente** | Anagrafica presente prima di chiudere offerta |
| Ore mancanti segnalate | **Ore** → **Aggiungi report ore** / **Nuovo report ore** (admin: vedi tutti) | Report salvato |

### 2.3 Chiusura giornata

1. **Da Emettere**: nessuna card «pronta» lasciata in **To Do** senza nota nella card.
2. **Scadute**: elenco noto; sollecito fatto o pianificato.
3. Nessuna card fattura lasciata in limbo tra produzione e **To Do** fatture (verifica con Capo produzione se manca routing).
4. Ore del giorno inserite se di tua competenza.

### 2.4 Settimanale / mensile

| Cadenza | Azione |
|---|---|
| Venerdì | Aging + **Incassi per settimana** su Dashboard Fatturazione |
| Fine mese | **Pagate** vs **Emesse**; Report Ore export (admin) |

### 2.5 Trigger evento

| Quando succede X | Fai Y |
|---|---|
| Produzione conferma **Conferma Fatturazione** | Apri **Fatture OUT** → lavora **To Do** |
| Cliente segnala pagamento | Sposta in **Pagata** |
| Fattura contestata | Lascia in **Inviata**; annota in card; avvisa Direttore; **non** spostare in **Pagata** |
| Collaboratore senza accesso board | Se `admin`: **Collaboratori** / permessi moduli; altrimenti avvisa admin |
| Password / account | Flusso invite/reset email (transazionale); non c’è alert automatico scadenze |

### 2.6 Regole d’oro

1. **Pagata** solo a pagamento confermato.
2. Ogni fattura in **Inviata** ha data consegna/scadenza usabile dal contatore **Scadute**.
3. Non creare doppioni: il codice fattura nasce dal routing `invoicing`.
4. Ore altrui: solo se `admin`/`superadmin`.
5. Presenze in attesa non restano aperte oltre la giornata se di tua competenza.

---

# 3. UFFICIO TECNICO

**Schermate tipiche:** Dashboard – AVOR; Kanban **AVOR** (`1_avor`); Kanban Ufficio; calendari per date rilievo.

### 3.1 Apertura giornata

1. **Dashboard – AVOR** → **Stato Pratiche AVOR** (una card per colonna Kanban: tipicamente To Do / Rilievo / Elaborazione / Produzione).  
   - Se colonna **To Do** > 0: apri Kanban **AVOR**, lavora le card in ordine (badge `-Ng` / `Oggi` prima).  
   - Se = 0: passo 2.
2. Pannello **Alert & Criticità**.  
   - Se «in ritardo» / «ferma da N giorni»: apri pratica, aggiorna colonna o `deliveryDate`, oppure avvisa Direttore.  
   - Se «senza categoria articoli»: apri card, assegna categoria prodotti, salva.  
   - Se «Nessuna criticità rilevata»: ok.
3. Kanban **AVOR**: scorri **Rilievo** e **Elaborazione**.  
   - Pratiche complete → sposta verso **Produzione** (colonna `production`) → dialog **Conferma Invio a Produzione** → **Conferma**.  
   - Se manca rilievo/misura: resta in **Rilievo**; avvisa Posa/cantiere se serve misura.
4. Verifica che le offerte **Vinte** di ieri abbiano generato card in **AVOR** (To Do). Se manca: avvisa chi ha messo **Vinta** / admin (routing `target_work_kanban_id`).

### 3.2 Durante la giornata

| Quando | Sequenza | Chiusura |
|---|---|---|
| Nuova pratica da offerta vinta | Card in **To Do** AVOR → completa dati/articoli → **Rilievo** o **Elaborazione** | Fuori da To Do entro fine giornata se assegnata a te |
| Rilievo fatto | Sposta **Rilievo** → **Elaborazione** | Colonna aggiornata |
| Pratica pronta per fabbrica | Sposta in colonna **Produzione** → **Conferma Invio a Produzione** | Card sulla board produzione del tipo prodotto (prima colonna) |
| Misura sbagliata | Riporta in **Rilievo**; avvisa Capo produzione se già in fabbrica (loro riportano colonna indietro) | Non lasciare in colonna **Produzione** AVOR |

### 3.3 Chiusura giornata

1. Nessuna criticità **high** in **Alert & Criticità** senza owner.
2. Nessuna card in colonna **Produzione** (AVOR) «pronta» non confermata (o conferma, o riporta indietro).
3. Badge consegna `Oggi`/`-Ng` su AVOR: tutti trattati o segnalati al Direttore.
4. Ore: **Ore** → **Aggiungi report ore** sulle pratiche lavorate.

### 3.4 Settimanale

| Cadenza | Azione |
|---|---|
| Lunedì | **Andamento settimanale** AVOR + confronto con Produzione (carico in ingresso) |
| Venerdì | Svuota **To Do** AVOR delle pratiche assegnate alla settimana |

### 3.5 Trigger evento

| Quando succede X | Fai Y |
|---|---|
| Misura sbagliata / rilievo incompleto | Colonna **Rilievo**; ferma invio produzione |
| Materiale non definito in distinta | Completa articoli/categorie in card; se già in produzione, avvisa Capo produzione |
| Cliente cambia progetto | Aggiorna card AVOR; se già in produzione, allinea Capo produzione prima di nuovi spostamenti |
| Invio produzione fallisce (resta su AVOR) | Verifica categoria prodotto + `production_routing` con admin; non ripetere DnD alla cieca |
| Offerta ancora in Elaborazione ma «vinta» a voce | Non creare pratica a mano se esiste flusso Vinta; fai mettere **Vinta** su Offerte |

### 3.6 Regole d’oro

1. **Conferma Invio a Produzione** solo con distinta e categoria prodotto corrette.
2. Ritardi: aggiorna `deliveryDate` o scala al Direttore, non ignorare badge `-Ng`.
3. «Senza categoria articoli» si chiude in giornata.
4. Non usare Produzione AVOR come parcheggio: o confermi o torni indietro.
5. Ore sulle pratiche del giorno prima di uscire.

---

# 4. CAPO PRODUZIONE

**Schermate tipiche:** Dashboard - Produzione; Kanban Produzione (board reparti); Calendario Produzione; opzionale Fabbrica / QC / Imballaggio.

### 4.1 Apertura giornata

1. **Dashboard - Produzione** → **Stato Produzione** (card per **nome kanban** reparto: progetti, elementi, CHF).  
   - Se un reparto ha picco elementi: apri quella board da **Kanban Produzione**.  
   - Se vuoto/anomalo: verifica con UT se mancano invii.
2. **Commesse calendari: riepilogo 3 settimane** → **Questa settimana** colonna **P**.  
   - Se **P** alto e **I** basso: prepara uscite verso posa.  
   - Allinea Capo posa se **I** della settimana è scoperto.
3. **Calendario Produzione** (`/calendar`): vista settimana.  
   - Pannello **Da definire**: trascina ogni card su un giorno.  
   - Se **N conflitti**: risolvi sovrapposizioni.  
   - Se **N con orario da definire**: imposta orari.
4. Apri le board produzione in carico: card in prima colonna (To Do / equivalente) = arrivi da AVOR. Assegna avanzamento colonna a colonna (DnD).
5. Controlla badge consegna sulle card (`Oggi`, `-Ng`): priorità assoluta.

### 4.2 Durante la giornata

| Quando | Sequenza | Chiusura |
|---|---|---|
| Arrivo da AVOR (dopo conferma produzione) | Card in To Do board reparto → avanza colonne di lavorazione | Fuori da To Do entro pianificazione giornaliera |
| Fine fase (es. CNC → Prep.) | DnD alla colonna successiva | Colonna aggiornata in realtime |
| Pronto a fatturare / spedire | DnD su colonna `invoicing` (es. **Spedito**) → **Conferma Fatturazione** | Card in **Fatture OUT** To Do (nuovo codice) |
| Imballaggio (se colonna/modulo) | **Conferma Spostamento Imballaggio** e/o **Imballaggio** / **Effettua imballaggio** | Step completato prima di Spedito se previsto |
| QC (se usato) | **Quality Control** / **Effettua QC** secondo flusso sito | QC salvato |

### 4.3 Chiusura giornata

1. Calendario Produzione: **Da definire** vuoto per la giornata odierna.
2. Nessuna card con badge `Oggi` lasciata ferma senza avanzamento o nota.
3. Card pronte a fattura: passate con **Conferma Fatturazione** o lasciate esplicitamente in coda con owner Amministrazione avvisato.
4. Ore giornaliere inserite (**Aggiungi report ore**).
5. Errori di fabbrica: modulo **Errori** → **Aggiungi errore** se applicabile.

### 4.4 Settimanale

| Cadenza | Azione |
|---|---|
| Lunedì | Riepilogo 3 settimane + allineamento Posa/Service su **I**/**S** |
| Venerdì | Svuota code To Do reparti; verifica board verso colonna `invoicing` |

### 4.5 Trigger evento

| Quando succede X | Fai Y |
|---|---|
| Materiale mancante | Ferma avanzamento colonna; apri **Magazzino** (verifica stock); avvisa UT/Amministrazione; aggiorna `deliveryDate` se serve |
| Guasto macchina / fabbrica | Modulo **Fabbrica** se usato; ripianifica su **Calendario Produzione**; non avanzare colonne fittizie |
| Misura sbagliata scoperta in lavorazione | Riporta card a colonna coerente; avvisa Ufficio tecnico (AVOR **Rilievo**) |
| Cliente urgenza | Riprioritizza DnD; aggiorna badge/date; avvisa Direttore se tocca altre commesse |
| QC fallito | Non spostare su colonna `invoicing`; correggi e ritesta |

### 4.6 Regole d’oro

1. Avanzamento solo con DnD reale sulla board (stato = colonna).
2. **Conferma Fatturazione** solo a pezzo pronto.
3. **Da definire** del giorno = zero a fine turno.
4. Materiale mancante: verifica Magazzino, non il testo Overview.
5. Allinea **I** (posa) prima di promettere uscite.

---

# 5. POSA

**Schermate tipiche:** **Calendario Posa**; se presente board **5. Posa** (To Do → Pian → Esecuzione → Collaudo); lettura Produzione (uscita pezzi).

### 5.1 Apertura giornata

1. Apri **Calendari → Posa** → **Calendario Posa** (vista settimana).
2. Controlla gli interventi di **oggi**.  
   - Se ok: stampa/annotati elenco.  
   - Se manca orario: **con orario da definire** → imposta `posa_ora_*` / orari in scheduler.
3. Pannello **Da definire**: trascina ogni card sul giorno corretto (`posa_data_inizio` / `posa_data_fine`).
4. Se esistono **conflitti**: risolvi prima di uscire in cantiere.
5. Se esiste Kanban **5. Posa**: sposta le card del giorno da **Pian** a **Esecuzione** all’avvio lavori.
6. Incrocia con Dashboard Produzione → riepilogo settimana colonna **I**: se **I** > pezzi pronti, avvisa Capo produzione.

### 5.2 Durante la giornata

| Quando | Sequenza | Chiusura |
|---|---|---|
| Arrivo in cantiere | Card in **Esecuzione** (se usi kanban) | Stato Esecuzione |
| Posa completata + collaudo ok | Sposta in **Collaudo** (se `invoicing`) → **Conferma Fatturazione** se richiesto dal sito | Card verso **Fatture OUT** o resta Collaudo secondo config |
| Solo calendario (senza board) | Aggiorna date/ore posa sullo scheduler; avvisa Amministrazione a voce/chat per fattura | Date posa valorizzate |
| Ripianificazione | Riporta in **Pian** / riposiziona su calendario | Nessun conflitto residuo |

### 5.3 Chiusura giornata

1. Calendario: interventi odierni non lasciati in **Da definire**.
2. Kanban (se usata): niente in **Esecuzione** a fine lavori senza avanzamento a **Collaudo** o nota di blocco.
3. Segnala a Capo produzione pezzi non posabili (mancanze).
4. Ore: **Aggiungi report ore** sulle commesse posate.

### 5.4 Settimanale

| Cadenza | Azione |
|---|---|
| Lunedì | Pianifica settimana su Calendario Posa; svuota **Da definire** della settimana |
| Venerdì | Verifica **Prossima settimana** (I) vs disponibilità squadra |

### 5.5 Trigger evento

| Quando succede X | Fai Y |
|---|---|
| Guasto / imprevisto in cantiere | Lascia/riporta **Esecuzione**; aggiorna calendario; avvisa Capo produzione + Direttore se cliente impattato |
| Misura sbagliata in cantiere | Ferma; avvisa Ufficio tecnico; non chiudere **Collaudo** |
| Materiale mancante in cantiere | Ferma; avvisa Capo produzione / Magazzino; ripianifica date posa |
| Cliente sposta appuntamento | Riposiziona su Calendario Posa; aggiorna **Pian** |
| Pezzo non pronto da fabbrica | Non pianificare; togli da oggi; avvisa produzione |

### 5.6 Regole d’oro

1. Niente uscita con card ancora in **Da definire** per oggi.
2. Conflitti calendario risolti prima del carico furgone.
3. **Collaudo**/fatturazione solo a posa accettata.
4. Date posa sempre su campi fase posa (non solo a memoria).
5. Ore di cantiere registrate in giornata.

---

# 6. SERVICE

**Schermate tipiche:** **Calendario Service**; Kanban **Service** (To Do → Pianificato → Esecuzione → Ultimato). Non esiste «ticket» separato: la card Kanban **è** il ticket.

### 6.1 Apertura giornata

1. **Calendari → Service** → **Calendario Service**.
2. Interventi di oggi: completa orari se **con orario da definire**.
3. **Da definire**: pianifica (`service_data_inizio` / `service_data_fine`).
4. Risolvi **conflitti**.
5. Kanban **Service**: card nuove in **To Do** → sposta in **Pianificato** quando hai data; quelle di oggi → **Esecuzione**.
6. Incrocia Dashboard Produzione breakdown **S** della settimana.

### 6.2 Durante la giornata

| Quando | Sequenza | Chiusura |
|---|---|---|
| Nuova richiesta cliente | Crea card in colonna creazione (**To Do**) Kanban Service (pulsante **+**) oppure da flusso progetti se usato | Card in To Do con cliente |
| Appuntamento fissato | **To Do** → **Pianificato** + data su Calendario Service | Visibile in calendario |
| Intervento in corso | **Pianificato** → **Esecuzione** | Esecuzione |
| Intervento chiuso | **Esecuzione** → **Ultimato** | Ultimato (nessun routing automatico fattura) |
| Serve fattura | Avvisa Amministrazione; crea/segui pratica su **Fatture OUT** secondo processo aziendale | Non aspettare automazione (colonne Service = `normal`) |

### 6.3 Chiusura giornata

1. Nessun intervento odierno lasciato in **Esecuzione** senza esito (Ultimato o ripianificato).
2. Calendario Service: **Da definire** scaricato per oggi.
3. Nuove chiamate del pomeriggio: almeno in **To Do** con cliente.
4. Ore registrate.

### 6.4 Settimanale

| Cadenza | Azione |
|---|---|
| Lunedì | Pianifica **S** della settimana; svuota To Do assegnabili |
| Venerdì | Card ferme in **Pianificato** da >7g: richiama cliente o chiudi |

### 6.5 Trigger evento

| Quando succede X | Fai Y |
|---|---|
| Cliente chiama guasto | Nuova card **To Do** Service → pianifica |
| Guasto in cantiere durante posa | Crea card Service collegata; avvisa Posa/Produzione |
| Ricambio / materiale mancante | Lascia **Esecuzione** o riporta **Pianificato**; Magazzino; nuova data |
| Intervento non risolto | Non mettere **Ultimato**; ripianifica; nota in card |
| Serve ricambio da produzione | Avvisa Capo produzione; eventuale pratica AVOR/produzione separata |

### 6.6 Regole d’oro

1. Ogni chiamata = card in **To Do** (niente solo carta/WhatsApp).
2. **Ultimato** solo a intervento chiuso.
3. Fatturazione service: handoff esplicito ad Amministrazione.
4. Calendario e Kanban allineati (stessa data).
5. Ore su ogni intervento chiuso.

---

# Chi passa la palla a chi

| Evento | Da | A | Stato record al passaggio |
|---|---|---|---|
| Offerta accettata | Direttore / commerciale | Ufficio tecnico | Offerte **Vinta** (`won`) → nuova card **AVOR** `LAVORO` in colonna creazione (To Do) |
| Offerta rifiutata | Direttore / commerciale | — (archivio) | Offerte **Persa** (`lost`) + motivazione |
| Pratica pronta in fabbrica | Ufficio tecnico | Capo produzione | AVOR colonna **Produzione** + **Conferma Invio a Produzione** → board produzione, prima colonna |
| Pezzo pronto a fattura | Capo produzione (o Posa su Collaudo) | Amministrazione | Colonna `invoicing` + **Conferma Fatturazione** → **Fatture OUT** **To Do** (nuovo codice `FATTURA`) |
| Fattura inviata | Amministrazione | Cliente (esterno) | **Fatture OUT** **Inviata** |
| Fattura saldata | Amministrazione | — | **Pagata** |
| Uscita verso cantiere | Capo produzione | Posa | Pianificazione su **Calendario Posa** / board Posa **Pian** |
| Posa conclusa (se Collaudo `invoicing`) | Posa | Amministrazione | **Collaudo** + conferma fatturazione |
| Ticket service | Chi riceve la chiamata | Service | Card **Service** **To Do** |
| Service chiuso da fatturare | Service | Amministrazione | **Ultimato** + handoff manuale (no auto-routing) |
| Misura errata | Posa / Produzione | Ufficio tecnico | Rientro **Rilievo** AVOR |
| Materiale mancante | Produzione / Posa / Service | Capo produzione + Magazzino (+ Amministrazione se acquisto) | Colonna bloccata; date aggiornate |

---

# Cronologia giornata tipo (tabella oraria)

Orari = proposta operativa (non nel software). Adatta ai turni reali Santini.

| Orario | Direttore | Amministrazione | Ufficio tecnico | Capo produzione | Posa | Service |
|---|---|---|---|---|---|---|
| 07:30–07:40 | — | — | — | Overview carico **Stato Produzione** + calendario **P** | Calendario Posa oggi + **Da definire** | Calendario Service oggi + **Da definire** |
| 07:40–08:00 | Overview KPI + Alert Offerte + Scadute | **Stato Fatture** + Presenze in attesa | **Stato Pratiche AVOR** + Alert & Criticità | Assegna To Do reparti / badge `-Ng` | Parte per cantieri (Esecuzione) | Parte interventi (Esecuzione) |
| 08:00–12:00 | Decisioni Vinta/Persa / priorità | Emissione **To Do**→**Inviata**; solleciti **Scadute** | Rilievo/Elaborazione; invii produzione | Avanzamento colonne; imballaggio/QC | Posa in cantiere | Service in campo |
| 12:30 | Check Alert Offerte | Check **Da Emettere** residuo | Check code To Do | Allinea uscite vs **I** | Aggiorna stati / ripianifica | Aggiorna stati / ripianifica |
| 13:30–17:00 | Escalation / clienti | Pagamenti → **Pagata**; anagrafiche | Chiudi pratiche verso produzione | **Conferma Fatturazione** pezzi pronti | Collaudo / rientri | Ultimato / nuove card To Do |
| 17:00–17:10 | Check Scadute + alert high | Checklist fatture + ore | Ore + zero criticità high aperte | Calendario senza Da definire oggi + ore | Ore + stati cantiere | Ore + To Do chiamate sera |

---

# Appendice — Non ancora disponibile (con workaround)

| Funzionalità attesa | Stato nel codice | Workaround manuale |
|---|---|---|
| Inbox notifiche operativa (menu **Notifiche**) | Stub, senza route | Usa **Alert Offerte**, **Alert & Criticità**, badge card, calendari |
| Campanella scadenze nel layout siti | Solo shell legacy `Structure`/`Navbar` | Stesso: pannelli dashboard + badge `Oggi`/`-Ng` |
| Dashboard dedicata Posa / Service | Assente | Calendari Posa/Service + breakdown **I**/**S** in Dashboard Produzione |
| Ruoli operativi come ACL | Solo `user`/`admin`/`superadmin` + permessi moduli/kanban | Assegnare esplicitamente moduli/board per collaboratore |
| Ticket service separato | Assente | Card Kanban **Service** |
| Alert «materiale mancante» vero | Testo hardcoded su ritardo consegna | Verificare **Magazzino** / distinta in card |
| Alert sottoscorta inventorio | `low_stock` non attivo | KPI **Sotto scorta minima** su Dashboard Inventario + lista Magazzino |
| Filtro periodo UI Fatturazione | Componente non montato | Usare query `?period=` se necessario, o leggere «Tutto» |
| Transizioni bloccate per ruolo | Chiunque con accesso board può DnD | Disciplina di processo (questo foglio) + permessi kanban ristretti |
| Push / email alert scadenze | Solo email transazionali (invite/password) | Routine apertura giornata obbligatoria |

---

## Riferimenti codice (indice)

- Ruoli: `lib/auth-utils.ts`, `lib/permissions.ts`
- Sidebar: `components/app-sidebar.tsx`, `lib/i18n/messages/it.ts`
- Dashboard data/alert: `lib/server-data.ts`
- Move + routing: `app/api/kanban/tasks/move/route.ts`
- Conferme DnD: `components/kanbans/KanbanBoard.tsx`
- Colonne IT di riferimento: `scripts/seed-scherman.ts` (Estrella: `scripts/seed-estrella.ts` — «rispecchia Santini»)
- Calendari: `components/calendar/calendarComponent.tsx`, `calendar-utils.ts`
- Guide correlate: `docs/GUIDA-UTENTE-ADMIN-USER.md`, `docs/MANUALE-USO-MODULI.md`

Schede stampabili: `docs/routine/*-A4.md`.
