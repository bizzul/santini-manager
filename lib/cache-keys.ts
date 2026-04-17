/**
 * Shared cache keys used across providers and client helpers.
 *
 * Bumping the version invalidates all persisted TanStack Query entries.
 * Keep in sync with `app/providers.tsx` (persistQueryClient `key`).
 */

export const QUERY_CACHE_PERSIST_KEY = "matris-query-cache-v2";
export const USER_CACHE_KEY = "matris-cache-user-id";
