import { createBrowserClient } from "@supabase/ssr";

// Singleton instance to prevent multiple clients from being created
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

// Rate limit protection - tracks when we got a 429 and should back off
let rateLimitedUntil: number = 0;
let refreshInProgress: Promise<any> | null = null;

export function createClient() {
  // Return existing instance if available (singleton pattern)
  if (supabaseClient) {
    return supabaseClient;
  }

  const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      cookieOptions: {
        name: COOKIE_NAME,
        domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: false,
        path: "/",
      },
      auth: {
        // DISABLED auto refresh to prevent 429 spam
        // We'll handle refresh manually when needed
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "X-Client-Info": "supabase-js-browser",
        },
      },
    },
  );

  // Set up manual token refresh with rate limiting
  setupManualTokenRefresh(supabaseClient);

  return supabaseClient;
}

/**
 * Sets up manual token refresh that respects rate limits
 */
function setupManualTokenRefresh(
  client: ReturnType<typeof createBrowserClient>,
) {
  // Check token expiry every 60 seconds (much less aggressive than default)
  const REFRESH_CHECK_INTERVAL = 60 * 1000; // 60 seconds
  const REFRESH_MARGIN = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  const RATE_LIMIT_BACKOFF = 60 * 1000; // Wait 60 seconds after 429

  const checkAndRefresh = async () => {
    // Skip if we're rate limited
    if (Date.now() < rateLimitedUntil) {
      console.log("[Supabase] Skipping refresh - rate limited");
      return;
    }

    // Skip if refresh is already in progress
    if (refreshInProgress) {
      return;
    }

    try {
      const { data: { session } } = await client.auth.getSession();

      if (!session) {
        return; // No session to refresh
      }

      // Check if token needs refresh (expires within REFRESH_MARGIN)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const needsRefresh = expiresAt - Date.now() < REFRESH_MARGIN;

      if (needsRefresh) {
        console.log("[Supabase] Token expiring soon, refreshing...");

        refreshInProgress = client.auth.refreshSession();
        const { error } = await refreshInProgress;
        refreshInProgress = null;

        if (error) {
          console.error("[Supabase] Refresh error:", error.message);

          // If rate limited, back off
          if (error.message.includes("429") || error.status === 429) {
            rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF;
            console.log("[Supabase] Rate limited, backing off for 60s");
          }
        } else {
          console.log("[Supabase] Token refreshed successfully");
        }
      }
    } catch (err) {
      console.error("[Supabase] Error checking session:", err);
      refreshInProgress = null;
    }
  };

  // Only run in browser
  if (typeof window !== "undefined") {
    // Initial check after a short delay
    setTimeout(checkAndRefresh, 5000);

    // Periodic checks
    setInterval(checkAndRefresh, REFRESH_CHECK_INTERVAL);

    // Also refresh on visibility change (user comes back to tab)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        setTimeout(checkAndRefresh, 1000);
      }
    });
  }
}
