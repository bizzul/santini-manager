# Manager dei Manager — Fase 0: Baseline e preparazione ambiente

> **Stato fasi (2026-07-09):** Fasi 0–6 implementate. La 7 (cutover) è
> un'operazione manuale documentata in fondo a questo file.
>
> | Fase | Stato | Contenuto |
> | --- | --- | --- |
> | 0 | ✅ | Baseline migrazioni + ambiente locale + questo documento |
> | 1 | ✅ | `manager_projects` + storico + vista ore (in produzione) |
> | 2 | ✅ | Componenti condivisi (HoursEntryForm parametrizzato, ProjectCard, nav config) |
> | 3 | ✅ | Shell super-admin con sidebar, dietro `NEXT_PUBLIC_MANAGER_OF_MANAGERS` |
> | 4 | ✅ | Board Kanban progetti con drag tra stage |
> | 5 | ✅ | Ore per progetto (vista + registrazione come `internal_activity='gestione_progetto'`) |
> | 6 | ✅ | Scheda progetto: gestione spazio (riuso pagine admin), note, storico |
> | 7 | ⏳ | Cutover graduale (vedi sezione 6) |

> **Aggiornamento 2026-07-09 — FASE 1 COMPLETATA.**
> Migrazione `20260709130000_manager_projects.sql` validata in locale
> (8 test: mapping stage, trigger eventi, RLS user/superadmin/anon, vista ore)
> e pushata in produzione. Esito seed: **35 progetti**
> (active 4, alpha 4, beta 19, client_demo 7, personal 1 — 14 da override
> superadmin, il resto da euristica), 35 eventi di stage iniziali, accesso
> anonimo/non-superadmin verificato vuoto. Nessuna tabella esistente toccata.
> Nuove entità: `manager_projects`, `manager_project_stage_events`,
> vista `manager_project_hours` (security_invoker), helper `is_superadmin()`.
> Rollback Fase 1: `DROP` delle sole entità nuove (nessuna dipendenza esterna).

Data rilevazione: 2026-07-09
Progetto Supabase remoto: `jzxffusiwtrvjwmpjztu` (linked in `supabase/.temp/project-ref`)

Questo documento è la baseline di riferimento per tutte le fasi successive del
piano "Superadmin Dashboard → Manager dei Manager". Dopo ogni fase, la smoke
checklist in fondo va rieseguita e confrontata con questi valori.

---

## 1. Verifica drift schema (repo vs DB remoto)

Rilevazione effettuata in sola lettura via API REST (introspezione OpenAPI).

### 1.0 ESITO FINALE: baseline al posto della history storica

La catena di migrazioni storiche è risultata **non replayabile da zero**
(vedi 1.1/1.2: ordinamento errato dello schema base `202507101310`, colonne
aggiunte a mano sul remoto come `Kanban.site_id`). Applicato il workflow
ufficiale di baselining, eseguito il 2026-07-09:

1. Le 104 migrazioni storiche (tutte già applicate in produzione) sono state
   spostate in `supabase/migrations_archive/` (conservate in git).
2. Creato `supabase/migrations/20260709120000_baseline.sql` con
   `supabase db dump --linked`: è lo schema **reale** di produzione
   (81 tabelle, 175 policy RLS, incluse le colonne drift).
3. History remota riallineata con `supabase migration repair`
   (104 versioni → reverted, baseline → applied). **Solo metadati**: nessun
   DDL eseguito in produzione.
4. `supabase db reset` locale: replay pulito del solo baseline, verificato
   (81 tabelle, `Kanban.site_id` e `Timetracking.site_id` presenti,
   175 policy, history = `20260709120000`).

Da ora in poi: le nuove migrazioni (Fase 1+) nascono sopra il baseline e si
validano in locale con `supabase db reset` prima del `db push`.

Rollback del baselining (mai necessario finché non si vuole tornare
indietro): ripristinare i file da `migrations_archive/`, eliminare il
baseline, ripetere i `repair` a stati invertiti.

### 1.1 `Timetracking.site_id` — drift confermato (superato dal baseline)

- Sul remoto la colonna `site_id uuid` **esiste** con FK verso `sites.id`;
  nel repo mancava la migrazione `ADD COLUMN` (solo il backfill
  `20260218000000`).
- Era stata creata la fix `20260217230000_add_timetracking_site_id.sql`
  (ora in `migrations_archive/`, obsoleta: il baseline include la colonna).
- Nota: la fix risulta anche applicata sul remoto (no-op) da un
  `supabase db push` eseguito il 2026-07-09 insieme a `personal_manager` e
  `momentum_event_addons`.

### 1.2 Altri drift rilevati (superati dal baseline)

| Oggetto | Repo (pre-baseline) | Remoto | Nota |
| --- | --- | --- | --- |
| Ordinamento schema base | `202507101310_schema_progetto_a.sql` (timestamp a 12 cifre) si applicava DOPO le migrazioni di gennaio 2025 che alteravano le sue tabelle | n/a | Causa del fallimento di `supabase db reset` da zero. |
| `Kanban.site_id` | **mai creata** da nessuna migrazione (ma `20250607` ci creava un vincolo sopra) | presente | Aggiunta a mano sul remoto. Ora nel baseline. |
| `tenants` | creata nello schema base | **assente** | Rimossa manualmente dal remoto. Nessun nuovo codice deve dipendere da `tenants`. |
| `pm_access`, `pm_life_areas` (Personal Manager) | migrazione `20260709000000` | presenti (pushate il 2026-07-09) | Allineato. |
| `ev_*` (Momentum eventi) | `20260708210000` | presenti | Allineato. |
| `user_site_select_preferences`, `demo_workspaces`, `site_settings`, `site_modules`, `user_organizations`, `internal_activities` | presenti | presenti | Allineato. |

### 1.3 Colonne `Timetracking` sul remoto (riferimento)

`id`, `created_at`, `updated_at`, `description`, `description_type`, `task_id`,
`employee_id`, `use_cnc`, `startTime`, `endTime`, `totalTime`, `hours`,
`minutes`, `site_id` (FK → sites), `activity_type`, `internal_activity`,
`lunch_offsite`, `lunch_location`.

---

## 2. Conteggi baseline (DB remoto, 2026-07-09)

| Metrica | Valore |
| --- | --- |
| `sites` | 34 |
| `organizations` | 14 |
| `user_site_select_preferences` (override categorie superadmin) | 14 |
| `Timetracking` (righe ore totali) | 1868 |
| `Timetracking` con `site_id IS NULL` | 0 |

Uso in Fase 1: il seed di `manager_projects` dovrà produrre **34 progetti**
(uno per sito), di cui 14 con stage derivato dall'override e 20 dall'euristica.

---

## 3. Ambiente di validazione migrazioni — PRONTO (2026-07-09)

| Requisito | Stato |
| --- | --- |
| Supabase CLI | v2.31.8, autenticata |
| Progetto linkato | `jzxffusiwtrvjwmpjztu` |
| Stack locale | funzionante: `supabase start` + `supabase db reset` replicano lo schema di produzione dal baseline (Studio: `http://127.0.0.1:54323`, DB: porta 54322) |
| Limiti noti del locale | nessun dato (schema-only); bucket storage assenti (sono dati, non schema); irrilevanti per la Fase 1 |

Workflow per tutte le fasi successive:

1. Scrivere la nuova migrazione in `supabase/migrations/`.
2. Validare in locale: `supabase db reset` (replay baseline + nuova).
3. Test RLS in locale con utenti di ruoli diversi.
4. Solo dopo: `supabase db push` in produzione.
5. Mai migrazione + UI dipendente nello stesso deploy.

Nota risolta durante il setup: al primo `supabase start` post-baseline il
container storage falliva con "Migration fix-optimized-search-function not
found" (versione storage locale più vecchia di quella remota, salvata in
`supabase/.temp/storage-version`). Risolto rimuovendo il file di versione e
riavviando con `supabase stop --no-backup && supabase start`.

---

## 4. Smoke checklist "spazi online intatti"

Da eseguire dopo ogni fase, su almeno uno spazio per categoria
(attivo: `santini` o `matris-pro`; una demo cliente; una beta).

| # | Verifica | Esito baseline | Dopo fase __ |
| --- | --- | --- | --- |
| 1 | Login utente normale e apertura spazio dal subdomain | | |
| 2 | Sidebar coerente con `site_modules` del sito | | |
| 3 | Dashboard overview carica (KPI, grafici) | | |
| 4 | Kanban FDM: apertura board + spostamento card di test | | |
| 5 | Area collaboratore: inserimento e visualizzazione di un'ora | | |
| 6 | Documenti/offerte: apertura documento esistente | | |
| 7 | Login admin org cliente → `/administration` mostra solo la propria org | | |
| 8 | Demo QR: token demo attivo risolve la landing | | |
| 9 | Nessun errore nuovo nei log Vercel/Supabase vs baseline | | |

La colonna "Esito baseline" va compilata manualmente prima di iniziare la
Fase 1 (serve un login reale sugli spazi).

---

## 5. Vincoli confermati per le fasi successive

- La colonna categoria **non esiste** su `sites`: lo stage dei progetti nasce
  in `manager_projects` (Fase 1) seedato da `user_site_select_preferences`
  (14 righe) + euristica `resolveSiteGroup` per i restanti siti.
- Le ore per progetto si derivano da `Timetracking.site_id` (già popolato al
  100%: 0 righe NULL) → la vista `manager_project_hours` è fattibile senza
  alcun backfill aggiuntivo.
- Nuove RLS: usare il pattern `"User".role = 'superadmin'` via `authId`
  (mai `auth.role()`, mai la tabella `tenants`).

---

## 6. Fase 7 — Procedura di cutover graduale (manuale)

La nuova shell è già deployabile: senza flag è invisibile a tutti. Il
cutover consiste solo nell'attivazione del flag in produzione.

1. **Pre-check:** smoke checklist (sezione 4) verde sull'ultimo deploy.
2. **Attivazione:** su Vercel → Project → Settings → Environment Variables
   aggiungi `NEXT_PUBLIC_MANAGER_OF_MANAGERS=true` (solo Production) e
   ridistribuisci. Effetto: la shell nuova appare **solo ai superadmin**;
   admin di org e spazi non cambiano in alcun caso.
3. **Fallback immediato:** rimuovere la variabile (o impostarla a valore
   diverso da `true`) e ridistribuire — ritorno completo alla dashboard a
   card, nessun dato perso (stage/note/ore restano in `manager_projects`).
4. **Osservazione:** 2–4 settimane di uso reale; smoke checklist
   settimanale sugli spazi attivi; monitorare i log Vercel/Supabase.
5. **Consolidamento (solo dopo validazione):**
   - rimuovere il ramo legacy dal layout admin e il flag;
   - opzionale: far leggere a `/sites/select` lo stage da
     `manager_projects` al posto dell'euristica + `user_site_select_preferences`
     (modifica additiva separata, con proprio rollback).

Divergenza nota durante la transizione: il drag in `/sites/select`
(vecchia pagina) aggiorna `user_site_select_preferences`, il drag nella
board progetti aggiorna `manager_projects.stage`. Le due viste possono
divergere finché il punto 5 non riconcilia; fonte di verità per la nuova
UI è sempre `manager_projects`.
