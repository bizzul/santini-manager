# Scan sicurezza export (2026-04-17)

## Azioni eseguite

| File | Problema | Azione |
|------|-----------|--------|
| `cursor_site_details_editing.md` | Password DB e stringa di connessione in chiaro nella conversazione | Sostituita con `[REDACTED]` / messaggio di rotazione password |
| `cursor_github_login_and_push.md` | PAT GitHub (`ghp_…`) | Sostituito con placeholder e nota di revoca |

## Azioni consigliate all’utente

1. **Supabase:** Database → Settings → reset password se la password è stata condivisa in chat.
2. **GitHub:** Revoca il token esposto in `cursor_github_login_and_push.md` (se era reale) e creane uno nuovo con scope minimo.
3. Prima di `git push` di questa cartella: `grep -rE 'ghp_|sk-|postgresql://postgres:[^[]' docs/chat-exports/` deve restituire **zero** segreti reali.
