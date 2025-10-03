import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";

export async function getSiteData(domain: string) {
  try {
    // Decode URL encoding and normalize domain
    const decodedDomain = decodeURIComponent(domain);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";

    // Check if it's a subdomain by looking for root domain pattern
    // Handle for port: "santini.localhost:3000" or "santini.localhost"
    const domainWithoutPort = decodedDomain.split(":")[0];
    const isSubdomain = domainWithoutPort.endsWith(`.${rootDomain}`);

    let query;
    if (isSubdomain) {
      // Extract subdomain from the domain without port
      const subdomain = domainWithoutPort.replace(`.${rootDomain}`, "");

      // Use service client to bypass RLS for public site access
      const supabase = createServiceClient();
      query = supabase.from("sites").select("*").eq("subdomain", subdomain);
    } else {
      // It's a custom domain
      const supabase = createServiceClient();
      query = supabase.from("sites").select("*").eq(
        "custom_domain",
        decodedDomain,
      );
    }

    return unstable_cache(
      async () => {
        try {
          const result = await query.single();

          return result;
        } catch (error) {
          console.error("Error in getSiteData query:", error);
          // Return null instead of throwing to prevent 500 errors
          return null;
        }
      },
      [`${domain}-metadata`],
      {
        revalidate: 900,
        tags: [`${domain}-metadata`],
      },
    )();
  } catch (error) {
    console.error("Error in getSiteData:", error);
    // Return null instead of throwing to prevent 500 errors
    return null;
  }
}
