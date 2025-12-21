import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

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

    // Debug logging
    console.log("[getSiteData] Input:", {
      domain,
      decodedDomain,
      rootDomain,
      domainWithoutPort,
      isFullDomain,
      subdomain,
    });

    // IMPORTANT: Create the Supabase client and query INSIDE the unstable_cache function
    // to avoid stale closures when the cache revalidates. The Supabase query builder
    // is not designed to be reused across different request contexts.
    return unstable_cache(
      async () => {
        try {
          // Create fresh client and query inside the cached function
          const supabase = createServiceClient();
          const result = await supabase
            .from("sites")
            .select("*")
            .eq("subdomain", subdomain)
            .single();

          console.log(
            "[getSiteData] Query result:",
            result.data ? "Found" : "Not found",
            result.error?.message,
          );
          return result;
        } catch (error) {
          console.error("[getSiteData] Query error:", error);
          logger.error("Error in getSiteData query:", error);
          return null;
        }
      },
      [`${subdomain}-metadata`], // Use subdomain for cache key
      {
        revalidate: 900,
        tags: [`${subdomain}-metadata`],
      },
    )();
  } catch (error) {
    console.error("[getSiteData] Error:", error);
    logger.error("Error in getSiteData:", error);
    return null;
  }
}
