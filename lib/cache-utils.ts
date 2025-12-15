/**
 * Utilities for managing React Query persistent cache
 */

const CACHE_KEY = "matris-query-cache";
const USER_CACHE_KEY = "matris-cache-user-id";

/**
 * Clear the persistent React Query cache from localStorage.
 * Should be called on logout to prevent data leakage between users.
 */
export function clearPersistentCache(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    console.log("[Cache] Persistent cache cleared");
  } catch (error) {
    console.error("[Cache] Error clearing persistent cache:", error);
  }
}

/**
 * Store the current user ID to detect user changes.
 * If the user ID changes, the cache should be invalidated.
 */
export function setCurrentUserId(userId: string): void {
  if (typeof window === "undefined") return;

  try {
    const storedUserId = localStorage.getItem(USER_CACHE_KEY);

    // If user changed, clear the cache
    if (storedUserId && storedUserId !== userId) {
      console.log("[Cache] User changed, clearing persistent cache");
      clearPersistentCache();
    }

    localStorage.setItem(USER_CACHE_KEY, userId);
  } catch (error) {
    console.error("[Cache] Error managing user cache:", error);
  }
}

/**
 * Check if cache belongs to current user and clear if not.
 * Returns true if cache was valid, false if it was cleared.
 */
export function validateCacheForUser(userId: string): boolean {
  if (typeof window === "undefined") return true;

  try {
    const storedUserId = localStorage.getItem(USER_CACHE_KEY);

    if (storedUserId && storedUserId !== userId) {
      console.log("[Cache] Cache belongs to different user, clearing");
      clearPersistentCache();
      localStorage.setItem(USER_CACHE_KEY, userId);
      return false;
    }

    if (!storedUserId) {
      localStorage.setItem(USER_CACHE_KEY, userId);
    }

    return true;
  } catch (error) {
    console.error("[Cache] Error validating cache:", error);
    return true;
  }
}
