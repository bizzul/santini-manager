/**
 * Shared cache keys used across providers and client helpers.
 *
 * Bumping the version invalidates all persisted TanStack Query entries.
 * Keep in sync with `app/providers.tsx` (persistQueryClient `key`).
 *
 * Version history (most recent first):
 *  - v3 (2026-04-17): `site-data` payload gained `commandDeckEnabled`.
 *    Clients holding a v2 entry in localStorage would keep the legacy
 *    shape (without the flag) for up to `staleTime`, hiding the new
 *    launcher even after the feature was enabled in `site_settings`.
 *    Bumping the key force-refreshes everyone on next load.
 *  - v2: previous release baseline.
 */

export const QUERY_CACHE_PERSIST_KEY = "matris-query-cache-v3";
export const USER_CACHE_KEY = "matris-cache-user-id";
