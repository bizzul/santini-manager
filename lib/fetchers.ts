import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";

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

    // Use service client to bypass RLS for public site access
    const supabase = createServiceClient();

    // Always query by subdomain column
    const query = supabase.from("sites").select("*").eq("subdomain", subdomain);

    return unstable_cache(
      async () => {
        try {
          const result = await query.single();
          return result;
        } catch (error) {
          console.error("Error in getSiteData query:", error);
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
    console.error("Error in getSiteData:", error);
    return null;
  }
}
