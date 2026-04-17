# FDM - Checklist di release

Obiettivo: rendere prevedibile il passaggio "codice locale -> online funzionante",
riducendo i casi piu ricorrenti di "non vedo le modifiche online" e di regressioni
post-deploy su dashboard/kanban/timetracking.

Usare questa checklist PRIMA di annunciare agli stakeholder che una feature e
disponibile online.

---

## 1. Pre-commit (locale)

- [ ] `npm run build` verde (nessun errore TypeScript)
- [ ] `npm test` verde sui moduli toccati
- [ ] Lint pulito (`npm run lint`) sui file modificati
- [ ] Feature flag `NEXT_PUBLIC_*` coinvolti verificati e documentati in
      `docs/FEATURE-FLAGS.md` se nuovi
- [ ] Migrazioni DB idempotenti (uso di `IF NOT EXISTS` / `DROP ... IF EXISTS`)
- [ ] Nessun segreto/token in codice o messaggi di commit

## 2. Commit e push

- [ ] Messaggio commit descrittivo e coerente con lo stile del repo
- [ ] `git status` pulito dopo il commit
- [ ] `git push origin HEAD` completato senza errori di permessi
- [ ] Remote allineato: `git log -1 origin/main` == commit appena pushato

## 3. Deploy

- [ ] Pipeline Vercel (o provider equivalente) ha completato con successo
- [ ] Nessun warning bloccante su env vars in dashboard provider
- [ ] Build remoto ha prodotto lo stesso set di rotte del build locale
- [ ] Se sono previste nuove rotte: verifica rotta raggiungibile (`curl -I`)

## 4. Migrazioni database

- [ ] Migrazione applicata su ambiente target (staging e/o prod)
- [ ] Confronto schema (`\d+ Task`, `\d+ attendance_entries`, etc.) ok
- [ ] Colonne/enum/check vincoli allineati a cio che si aspetta la UI
- [ ] Eseguita query di fumo su 1-2 record rappresentativi

## 5. Smoke test post-deploy

Per ogni release eseguire almeno questi passaggi manuali (1-2 minuti totali):

- [ ] Login utente test (profilo non admin)
- [ ] Apertura dashboard principale: KPI presenti, nessun errore in console
- [ ] Apertura kanban: drag&drop 1 card, verifica aggiornamento
- [ ] Apertura scheda progetto: verifica campi "Info cantiere", "Storico",
      "Collaboratori", "Documenti"
- [ ] Timetracking: inserimento 1 report ore, verifica riga in tabella
- [ ] Report: almeno 1 export eseguito (es. export progetti)
- [ ] Hard refresh (Cmd+Shift+R) per escludere cache browser

## 6. Feature-flag dipendenti

Se la release tocca preferenze kanban o copertina:

- [ ] Verificato effetto con `NEXT_PUBLIC_ENABLE_CARD_PREFS=true`
- [ ] Verificato effetto con `NEXT_PUBLIC_ENABLE_CARD_PREFS=undefined/false`
- [ ] Nessun bug apparente dovuto a `localStorage` residuo (uso il pulsante
      "Reset preferenze" nella toolbar kanban)

## 7. Rollback plan

- [ ] Commit precedente stabile identificato (`git log -1 origin/main~1`)
- [ ] Piano rollback documentato (revert commit vs redeploy snapshot)
- [ ] Migrazione DB reversibile oppure piano alternativo (script di
      ripristino, snapshot recente)

## 8. Comunicazione

- [ ] Note di rilascio pronte (anche solo 2-3 righe)
- [ ] Stakeholder avvisati se l'UX cambia (in particolare dashboard/kanban)
- [ ] Aggiornato `docs/FEATURE-FLAGS.md` se i flag sono cambiati

---

## Diagnostica quando "online non vedo le modifiche"

1. `git fetch` + confronto `origin/main` con commit atteso
2. Verifica deploy provider (stato build, logs)
3. Verifica env vars caricate in build online
4. Hard refresh + pulizia storage (console: `localStorage.clear()` oppure
   pulsante "Reset preferenze" kanban)
5. Se persiste: controlla cache CDN del provider (invalidate/rebuild)
