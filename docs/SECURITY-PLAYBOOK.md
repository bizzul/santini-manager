# FDM - Security playbook (essenziale)

Documento operativo minimo per ridurre i rischi di leak credenziali,
escalation di privilegi e uso scorretto di token di terze parti (GitHub,
Supabase, Vercel).

## Credenziali e segreti

### Do
- Mantenere segreti SOLO in variabili ambiente (`.env.local` locale,
  dashboard provider per staging/prod).
- Variabili lato client: solo `NEXT_PUBLIC_*` con dati non sensibili.
- Token di terze parti con scope minimo necessario.
- Rotazione periodica: almeno ogni 90 giorni per PAT condivisi.

### Don't
- Incollare token (`ghp_*`, `sk_*`, service role key) in chat, issue,
  messaggi di commit o file versionati.
- Aggiungere credenziali in URL remote git (`https://user:TOKEN@...`).
- Riutilizzare lo stesso PAT per CI e uso personale.

## In caso di leak

1. Revocare immediatamente il token (GitHub Settings / Supabase dashboard).
2. Rigenerare un nuovo token con scope minimo.
3. Controllare log (GitHub audit log, Vercel deployments, Supabase usage).
4. Ripulire credenziali cache locali:
   ```bash
   git credential-osxkeychain erase
   # oppure provider corrispondente
   ```
5. Se il token e stato esposto in una chat/email: rimuovere il messaggio
   se possibile e documentare l'incidente.

## Permessi repository GitHub

- Repo su organizzazione (es. `bizzul/*`): richiedere collaboratori o
  token del bot di CI con scope `repo` minimo.
- In caso di push `403`: non forzare con PAT personale se non
  esplicitamente autorizzato. Coordinarsi con l'owner.
- Mai usare `--force` su `main` senza autorizzazione scritta.

## Supabase

- Il `service_role` key bypassa RLS: usarla SOLO in API route server-side.
- Verificare che ogni query di modulo filtri per `site_id` per evitare
  data leak tra tenant.
- In migrazioni, preferire strutture idempotenti (`IF NOT EXISTS`,
  `DROP ... IF EXISTS`) per evitare incoerenze tra ambienti.

## Dati utenti

- Non esportare dati personali (nome, email, presenze) in file locali non
  versionati di lungo termine.
- Export CSV/Excel solo per utenti autorizzati (ruolo admin e superiori).
- Log di applicazione non devono contenere dati sensibili del cliente.

## Checklist sicurezza per ogni release

- [ ] Nessun segreto nel diff (`git log -p | rg "ghp_|sk_|service_role"`).
- [ ] Endpoint sensibili protetti da ruolo (admin/superadmin).
- [ ] RLS e filtro `site_id` verificato nelle nuove query Supabase.
- [ ] Env vars pubbliche (`NEXT_PUBLIC_*`) non contengono dati sensibili.
- [ ] Rimosse feature debug (overlay cover-source, ecc.) in prod.

## Allegati e riferimenti

- `docs/FEATURE-FLAGS.md`
- `docs/RELEASE-CHECKLIST-FDM.md`
- `docs/DEV-TROUBLESHOOTING.md`
