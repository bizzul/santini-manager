-- Assegna site_id a tutte le registrazioni ore che ne sono prive
UPDATE "Timetracking"
SET site_id = '7ce3bca0-2293-4328-bee3-b8347c581b5b'
WHERE site_id IS NULL;
