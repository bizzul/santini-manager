-- Enable the Command Deck (`command_deck_enabled = true`) on the main
-- production "santini" space after the V2.5 alpha validation on
-- `santini-copia`.
--
-- Follow-up to 20260418120000_seed_command_deck_for_copia_sites.sql.
-- Kept as a separate migration (rather than extending the previous one)
-- because migrations must be immutable once applied on any environment.
--
-- Idempotent: ON CONFLICT DO NOTHING preserves any explicit admin toggle
-- that might already exist (e.g. if the flag was set from the admin UI
-- before this migration runs).

BEGIN;

INSERT INTO site_settings (site_id, setting_key, setting_value, updated_at)
SELECT
    id,
    'command_deck_enabled',
    'true'::jsonb,
    NOW()
FROM sites
WHERE subdomain = 'santini'
ON CONFLICT (site_id, setting_key) DO NOTHING;

COMMIT;
