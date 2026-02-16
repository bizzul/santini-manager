# Verifica ore salvate in DB vs Report

Guida per controllare se le ore inserite dagli utenti sono salvate nel DB ma non compaiono nei report.

## Possibili cause

1. **`site_id` mancante** – Le ore create via API non salvavano `site_id`; il report filtra per sito
2. **Attività interne** – Senza `site_id` e senza `task_id`, il filtro per sito le esclude
3. **`employee_id`** – Mismatch tra auth UUID e ID interno utente

## Come verificare

### 1. Query SQL in Supabase (SQL Editor)

**Ore salvate per un utente in un intervallo di date:**
```sql
-- Sostituisci con l'auth UUID dell'utente e le date
SELECT t.id, t.created_at, t.hours, t.minutes, t.totalTime, 
       t.site_id, t.task_id, t.activity_type, t.internal_activity,
       u.given_name, u.family_name, u.authId
FROM "Timetracking" t
JOIN "User" u ON u.id = t.employee_id
WHERE u.authId = 'UUID-DELL-UTENTE'
  AND t.created_at >= '2025-02-01'
  AND t.created_at < '2025-02-17'
ORDER BY t.created_at DESC;
```

**Ore con `site_id` nullo (potrebbero non apparire nel report):**
```sql
SELECT t.id, t.created_at, t.hours, t.minutes, t.site_id, t.task_id, 
       t.activity_type, u.given_name, u.family_name
FROM "Timetracking" t
JOIN "User" u ON u.id = t.employee_id
WHERE t.site_id IS NULL
  AND t.created_at >= '2025-02-01'
ORDER BY t.created_at DESC;
```

**Confronto: ore che il report includerebbe (per un sito):**
```sql
-- Sostituisci SITE_ID con l'ID del sito
SELECT t.id, t.created_at, t.hours, t.minutes, t.site_id, t.task_id,
       tk.site_id as task_site_id
FROM "Timetracking" t
LEFT JOIN "Task" tk ON tk.id = t.task_id
WHERE (t.site_id = 'SITE_ID' OR tk.site_id = 'SITE_ID')
  AND t.created_at >= '2025-02-01'
  AND t.created_at < '2025-02-17'
ORDER BY t.created_at DESC;
```

### 2. Verifica rapida da browser

1. Apri DevTools (F12) → tab **Network**
2. Salva delle ore dalla pagina di registrazione
3. Controlla la risposta della chiamata a `/api/time-tracking/create`
4. Verifica che `results` contenga gli ID creati
5. In Supabase → Table Editor → `Timetracking`, cerca quei ID e controlla `site_id`

### 3. Correzione applicata

Dopo la correzione in `create-page.tsx` e `api/time-tracking/create`:

- Le **nuove** ore avranno `site_id` valorizzato (grazie all'header `x-site-domain`)
- Le ore **già salvate** con `site_id` null: per le attività su progetto si può usare il `site_id` del task

**Script per aggiornare record esistenti con site_id null:**

```sql
-- Imposta site_id dal task per le registrazioni su progetto
UPDATE "Timetracking" t
SET site_id = tk.site_id
FROM "Task" tk
WHERE t.task_id = tk.id
  AND t.site_id IS NULL
  AND tk.site_id IS NOT NULL;
```

Per le attività interne senza task, il `site_id` va impostato manualmente in base al contesto.
