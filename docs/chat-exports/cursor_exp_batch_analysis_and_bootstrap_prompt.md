# Prompt operativo: analisi completa `cursor_exp` + bootstrap comandi

```text
Sei un agente operativo del progetto FDM.

OBIETTIVO
1) Analizzare TUTTI i file `.md` presenti in:
   /Users/matteopaolocci/Desktop/cursor_exp
2) Estrarre pattern, richieste ricorrenti, errori ricorrenti, blocchi di rilascio e azioni migliori.
3) Eseguire i primi comandi operativi standard emersi in questa chat.

VINCOLI OPERATIVI
- Tempo massimo sessione: 45 minuti.
- Budget massimo token: 200 USD (soft limit operativo: fermati e chiedi conferma se superi ~70% del budget).
- Priorita`: output pratico, niente teoria lunga.

FASE A - RACCOLTA E ANALISI
1. Elenca tutti i file markdown in `cursor_exp`.
2. Leggili tutti.
3. Per ciascun file estrai:
   - titolo/tema
   - tipo richiesta (UI, API, DB, deploy, auth, report, data quality, ecc.)
   - esito (risolto/non risolto/parziale)
   - cause di blocco
   - comandi usati con successo
4. Produci una sintesi finale con:
   - Top 10 richieste ricorrenti
   - Top 5 incidenti ricorrenti
   - Top 5 azioni preventive

FASE B - ESECUZIONE COMANDI BOOTSTRAP
Esegui in questo ordine i primi comandi operativi standard:
1) `git status --short --branch`
2) `git diff --staged; git diff`
3) `git log -8 --oneline`
4) `npm run build`

FASE C - REPORT FINALE
Restituisci:
1) Stato repository (branch, modifiche, ahead/behind)
2) Esito build (pass/fail + errori chiave)
3) Riepilogo analisi `cursor_exp`
4) Piano azione in 3 livelli:
   - Immediate (oggi)
   - Breve termine (questa settimana)
   - Medio termine (questo mese)

FORMATO OUTPUT OBBLIGATORIO
## Stato tecnico
- ...

## Analisi richieste passate (cursor_exp)
- ...

## Comandi eseguiti
- ...

## Piano operativo FDM
- Immediate:
- Settimana:
- Mese:

STOP CONDITIONS
- Se build fallisce: fermati, mostra root cause e fix suggeriti.
- Se rischio superamento budget: stop e richiesta conferma.

UNBLOCK POLICY (ripresa automatica)
Se durante l'esecuzione ti trovi in uno di questi casi:
- errore non diagnosticabile
- tool/permesso negato
- task ambiguo senza modo di chiedere conferma
- due tentativi consecutivi falliti
- timeout silenzioso
allora:
1) Elenca tutti i `.md` in /Users/matteopaolocci/Desktop/cursor_exp
2) Seleziona casualmente almeno 5 chat (se < 5, prendi tutte)
3) Estrai da ciascuna: tema, tipo problema, soluzione, comandi utili
4) Costruisci mappa contesto (max 15 righe)
5) Proponi 3 ipotesi d'azione ordinate per priorita`
6) Applica subito l'ipotesi a rischio minore
7) Riprendi le fasi A/B/C dal punto interrotto
8) Registra nel report quali chat hanno fornito insight
Riferimento completo: fdm_unblock_policy.md nella stessa cartella.
```

