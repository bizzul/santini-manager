import { revalidateTag, unstable_cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Fetch site data by domain/subdomain
 *
 * This function uses Next.js cache with a 15-minute revalidation period.
 * IMPORTANT: If the site is not found, we don't cache that result to avoid
 * issues when sites are created or renamed.
 */
export async function getSiteData(domain: string) {
  try {
    // Decode URL encoding and normalize domain
    const decodedDomain = decodeURIComponent(domain);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";

    // Check if it's a full domain (contains root domain) or just subdomain
    const domainWithoutPort = decodedDomain.split(":")[0];
    const isFullDomain = domainWithoutPort.endsWith(`.${rootDomain}`);

    // Extract the subdomain - either it's already just the subdomain,
    // or we need to strip the root domain
    const subdomain = isFullDomain
      ? domainWithoutPort.replace(`.${rootDomain}`, "")
      : domainWithoutPort;

    // First, try to get from cache
    const cachedResult = await unstable_cache(
      async () => {
        try {
          // Create fresh client and query inside the cached function
          const supabase = createServiceClient();
          const result = await supabase
            .from("sites")
            .select("*")
            .eq("subdomain", subdomain)
            .single();

          // If site is found, return it for caching
          if (result.data) {
            return result;
          }

          // If not found, return a special marker that we can detect
          // This prevents caching null results for too long
          return { data: null, error: result.error, _notFound: true };
        } catch (error) {
          console.error("[getSiteData] Query error:", error);
          logger.error("Error in getSiteData query:", error);
          return { data: null, error, _error: true };
        }
      },
      [`${subdomain}-metadata`], // Use subdomain for cache key
      {
        revalidate: 900, // 15 minutes for successful lookups
        tags: [`${subdomain}-metadata`],
      },
    )();

    // If the cached result indicates the site wasn't found or there was an error,
    // try a fresh query without cache to handle recently created sites
    const resultWithMarkers = cachedResult as {
      _notFound?: boolean;
      _error?: boolean;
    } | null;
    if (resultWithMarkers?._notFound || resultWithMarkers?._error) {
      try {
        const supabase = createServiceClient();
        const freshResult = await supabase
          .from("sites")
          .select("*")
          .eq("subdomain", subdomain)
          .single();

        // If found on fresh query, revalidate the cache tag so next request uses the new data
        if (freshResult.data) {
          try {
            revalidateTag(`${subdomain}-metadata`);
          } catch (e) {
            // revalidateTag might fail in some contexts, that's ok
          }
          return freshResult;
        }

        // Still not found after fresh query
        return freshResult;
      } catch (error) {
        logger.error("Error in getSiteData fresh query:", error);
        return null;
      }
    }

    return cachedResult;
  } catch (error) {
    logger.error("Error in getSiteData:", error);
    return null;
  }
}
