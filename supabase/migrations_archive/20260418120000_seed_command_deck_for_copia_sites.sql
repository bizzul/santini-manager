-- Seed the per-site Command Deck toggle (`command_deck_enabled`) to `true`
-- for every site whose subdomain contains "copia" (case-insensitive).
--
-- Rationale
-- ---------
-- Before v2.5 the Command Deck was gated by a hardcoded regex on the
-- subdomain (`/copia/i`). The feature has since been moved to a persistent
-- `site_settings.command_deck_enabled` boolean so superadmins can toggle
-- it from the admin UI. This migration preserves the previous behavior
-- on any already-existing "copia" space so users don't have to manually
-- re-enable the feature right after the deploy.
--
-- Idempotent: `ON CONFLICT DO NOTHING` ensures this migration never
-- overwrites a value that was already set (e.g. if a superadmin
-- intentionally disabled the feature on a "copia" site before the
-- migration runs).

BEGIN;

INSERT INTO site_settings (site_id, setting_key, setting_value, updated_at)
SELECT
    id,
    'command_deck_enabled',
    'true'::jsonb,
    NOW()
FROM sites
WHERE subdomain ILIKE '%copia%'
ON CONFLICT (site_id, setting_key) DO NOTHING;

COMMIT;
