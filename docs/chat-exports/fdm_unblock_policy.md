# FDM - Unblock Policy (auto-ripresa in caso di blocco)

Scopo: in caso di stallo operativo (errore ambiguo, task incomprensibile, regressione non
diagnosticabile, tool/permesso negato, deadlock decisionale), riprendere automaticamente
ricostruendo contesto dalle chat storiche.

## Trigger di attivazione
Attiva questa policy se si verifica una di queste condizioni:
1. L'agente non sa come procedere per oltre 2 tentativi consecutivi.
2. Tool call falliti o negati in modo bloccante.
3. Errore/stacktrace senza soluzione diretta.
4. Richiesta utente poco chiara e impossibile chiedere chiarimenti.
5. Timeout silenzioso su deploy/build/test.

## Procedura automatica di ripresa
1. Leggi l'elenco completo dei file `.md` in `/Users/matteopaolocci/Desktop/cursor_exp`.
2. Seleziona in modo casuale almeno 5 chat (se presenti meno di 5, prendi tutte le disponibili).
3. Per ciascuna chat estrai:
   - tema principale
   - tipo problema (UI/API/DB/deploy/auth/data/performance)
   - soluzioni che hanno funzionato
   - errori ricorrenti
   - comandi utili usati
4. Costruisci una "mappa contesto" sintetica (max 15 righe).
5. Proponi 3 ipotesi d'azione per sbloccare la situazione, ordinate per priorita`.
6. Applica subito la prima ipotesi se sicura. Se ambigua, documenta le 3 ipotesi e procedi
   con quella a rischio minore.
7. Registra nel log finale quale chat ha fornito insight utili.

## Output atteso dopo ripresa
- Mappa contesto:
- Chat usate (nomi file):
- Ipotesi di ripresa (3):
- Azione scelta:
- Motivazione:
- Prossimi passi:

## Regole di sicurezza
- Non eseguire operazioni distruttive senza backup/conferma.
- Se la ripresa richiede push/deploy, applicare sempre la checklist release prima.
- Mantenere coerenza con gli agenti FDM (Analisi/Implementazione/QA/Release).
- Se dopo due cicli di ripresa il blocco persiste: sospendere e restituire riepilogo.
