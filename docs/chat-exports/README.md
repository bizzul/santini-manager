# Export chat Cursor (`cursor_exp`)

Questa cartella è una **copia** degli export presenti in `~/Desktop/cursor_exp`, sincronizzata il **17 aprile 2026** per permettere agli agenti e al team di lavorare sul contesto storico **dentro il repository**.

## Uso

- **Fonte canonica sul Mac:** `~/Desktop/cursor_exp` (aggiorna lì, poi ricopia con `cp ~/Desktop/cursor_exp/*.md docs/chat-exports/`).
- **Prompt operativi FDM:** file `fdm_*.md` e `cursor_exp_batch_analysis_and_bootstrap_prompt.md` descrivono batch, orchestrator e unblock policy.
- **Mappa chat → aree:** `fdm_verification_and_improvement_master.md` (batch 1–4).

## Sicurezza (obbligatorio)

Gli export delle chat possono contenere **password, connection string, token GitHub**, ecc.

- È stato eseguito un passaggio di **redazione** su copie in repo (vedi `SECURITY-SCAN-2026-04-17.md`).
- **Ruota comunque** le credenziali se sono mai state incollate in chat o committate: password DB Supabase, PAT GitHub, chiavi API.

Non committare nuovi export senza aver cercato `ghp_`, `postgresql://postgres:`, `sk-`, chiavi lunghe alfanumeriche.

## Documenti derivati

- Indice file-per-file: `INDEX.md`
- Backlog unificato (chat + audit dati): `../CHAT-EXPORTS-MASTER-BACKLOG.md`
- Ingestione per run multi-agente: `../agents-reports/INGEST-CURSOR-EXP-2026-04-17.md`
