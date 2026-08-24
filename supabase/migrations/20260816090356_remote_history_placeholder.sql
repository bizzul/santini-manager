-- Version present on the linked remote (schema_migrations) but missing from
-- this repo. No-op so `supabase db push` can align history. Do not re-apply
-- schema here: the remote already ran this version on 2026-08-16.
SELECT 1;
