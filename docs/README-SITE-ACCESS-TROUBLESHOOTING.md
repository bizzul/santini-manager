# Troubleshooting Accesso ai Siti

## Problema: Redirect al Login quando si seleziona un'organizzazione

### Sintomi
- L'utente è autenticato e può vedere la lista dei siti
- Quando seleziona un sito specifico, viene reindirizzato al login
- Il problema si verifica solo online, non in locale
- Altri siti funzionano correttamente

### Causa
Il problema è causato da **mancanza di permessi** nel database. L'utente è autenticato ma non ha i permessi necessari per accedere a quella specifica organizzazione/sito.

Questo accade quando:
1. L'utente non è collegato all'organizzazione del sito nella tabella `user_organizations`
2. L'utente non ha accesso diretto al sito nella tabella `user_sites`
3. Le policy RLS (Row Level Security) del database bloccano l'accesso ai dati

### Soluzione

#### Step 1: Diagnosticare il problema

Usa lo script di diagnostica per identificare il problema:

```bash
bun run scripts/diagnose-site-access.ts <email-utente> [nome-sito]
```

**Esempi:**
```bash
# Analisi generale di un utente
bun run scripts/diagnose-site-access.ts mario.rossi@example.com

# Analisi specifica per un sito
bun run scripts/diagnose-site-access.ts mario.rossi@example.com santini
```

Lo script verificherà:
- ✅ Se l'utente esiste nel sistema
- ✅ Se l'utente ha un record nella tabella `User`
- ✅ Se l'utente è collegato a organizzazioni (`user_organizations`)
- ✅ Se l'utente ha accesso diretto ai siti (`user_sites`)
- ✅ La corrispondenza tra organizzazioni dell'utente e organizzazione del sito

#### Step 2: Risolvere il problema

Una volta identificato il problema, usa lo script di fix per aggiungere l'utente all'organizzazione:

```bash
bun run scripts/fix-user-site-access.ts <email-utente> <nome-sito>
```

**Esempio:**
```bash
bun run scripts/fix-user-site-access.ts mario.rossi@example.com santini
```

Lo script:
1. Trova l'utente nel sistema
2. Trova il sito richiesto
3. Verifica se l'utente ha già accesso
4. Aggiunge l'utente all'organizzazione del sito se necessario

#### Step 3: Testare

Dopo aver eseguito lo script:
1. L'utente deve fare **logout** e **login** di nuovo
2. Cancellare i cookie del browser (opzionale ma consigliato)
3. Provare ad accedere al sito

## Modifiche Implementate

### 1. Controllo di Accesso nel Layout (`app/sites/[domain]/layout.tsx`)

Il layout ora verifica che l'utente abbia effettivamente accesso al sito prima di renderizzare la pagina:

```typescript
// Check if user has access to this site
const hasAccess = await checkSiteAccess(data.id, userContext);
if (!hasAccess) {
  redirect("/sites/select?error=no_access");
}
```

### 2. Messaggio di Errore Chiaro (`app/sites/select/page.tsx`)

La pagina di selezione dei siti ora mostra un messaggio chiaro quando l'utente non ha accesso:

> ⚠️ Non hai accesso a questo spazio. Per favore contatta l'amministratore per richiedere l'accesso.

### 3. Script di Diagnostica (`scripts/diagnose-site-access.ts`)

Script completo per diagnosticare problemi di accesso utente.

### 4. Script di Fix (`scripts/fix-user-site-access.ts`)

Script automatico per aggiungere utenti alle organizzazioni corrette.

## Architettura dei Permessi

### Tabelle Coinvolte

1. **`User`** - Contiene il ruolo dell'utente (`superadmin`, `admin`, `user`)
2. **`organizations`** - Le organizzazioni nel sistema
3. **`sites`** - I siti, ognuno collegato a un'organizzazione tramite `organization_id`
4. **`user_organizations`** - Collega utenti a organizzazioni (many-to-many)
5. **`user_sites`** - Accesso diretto di utenti a siti specifici (opzionale)

### Logica di Accesso

Un utente può accedere a un sito se:
- È un **superadmin** (accesso a tutto) ✅
- Appartiene all'**organizzazione** del sito (tramite `user_organizations`) ✅
- Ha **accesso diretto** al sito (tramite `user_sites`) ✅

## Prevenzione

Per evitare questo problema in futuro:

1. **Quando si crea un nuovo sito**: Assicurarsi di collegarlo a un'organizzazione
2. **Quando si aggiunge un utente**: Assicurarsi di aggiungerlo alle organizzazioni corrette
3. **Testare in produzione**: Dopo modifiche al database, testare l'accesso utente
4. **Monitorare i log**: I log ora mostrano informazioni dettagliate sui tentativi di accesso negati

## Debugging Avanzato

### Verificare i Cookie

In produzione, i cookie devono essere impostati con il dominio corretto:

```typescript
// In utils/supabase/cookie.ts
domain: `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
```

### Verificare le Variabili d'Ambiente

Assicurarsi che `NEXT_PUBLIC_ROOT_DOMAIN` sia configurato correttamente in Vercel:
- Locale: `localhost`
- Produzione: `tuodominio.com`

### Verificare le Policy RLS

Le policy RLS devono permettere agli utenti di leggere i dati delle loro organizzazioni:

```sql
-- Esempio di policy per la tabella sites
CREATE POLICY "Users can view sites of their organizations"
ON sites FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_organizations 
    WHERE organization_id = sites.organization_id
  )
);
```

## Domande Frequenti

**Q: Perché funziona in locale ma non online?**  
A: Probabilmente i dati di test in locale hanno i permessi corretti, mentre in produzione mancano i collegamenti nella tabella `user_organizations`.

**Q: Devo fare sempre logout/login dopo la fix?**  
A: Sì, il contesto utente viene cachato nella sessione. Un nuovo login forza il refresh dei permessi.

**Q: Posso dare accesso a un utente senza aggiungerlo all'organizzazione?**  
A: Sì, puoi usare la tabella `user_sites` per dare accesso diretto a siti specifici.

**Q: Come faccio a dare accesso a tutti i siti di un'organizzazione?**  
A: Aggiungi l'utente all'organizzazione tramite `user_organizations`. Automaticamente avrà accesso a tutti i siti di quell'organizzazione.

