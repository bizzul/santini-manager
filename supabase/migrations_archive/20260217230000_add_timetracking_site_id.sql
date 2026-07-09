-- Riallineamento drift: la colonna Timetracking.site_id esiste già sul DB
-- remoto (con FK verso sites.id) ma la migrazione ADD COLUMN non era mai
-- stata committata nel repo (esiste solo il backfill 20260218000000).
-- Questa migrazione è interamente idempotente: no-op sul remoto, ricrea la
-- colonna negli ambienti costruiti da zero (branch dev, CI, locale).

ALTER TABLE "public"."Timetracking"
    ADD COLUMN IF NOT EXISTS "site_id" uuid;

-- FK aggiunta solo se non esiste già una FK su site_id (il nome del vincolo
-- sul remoto non è noto, quindi si controlla per colonna e non per nome).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'public."Timetracking"'::regclass
          AND c.contype = 'f'
          AND a.attname = 'site_id'
    ) THEN
        ALTER TABLE "public"."Timetracking"
            ADD CONSTRAINT "Timetracking_site_id_fkey"
            FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id")
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_timetracking_site_id
    ON "public"."Timetracking" USING btree ("site_id");
