import { unstable_cache } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/server";

export async function getSiteData(domain: string) {
  try {
    // Check if it's a subdomain
    const isSubdomain = domain.endsWith(
      `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    );

    let query;
    if (isSubdomain) {
      // Extract subdomain from the full domain
      const subdomain = domain.replace(
        `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
        "",
      );

      console.log("Fetching site data for subdomain:", subdomain);

      // Use service client to bypass RLS for public site access
      const supabase = createServiceClient();
      query = supabase.from("sites").select("*").eq("subdomain", subdomain);
    } else {
      // It's a custom domain
      console.log("Fetching site data for custom domain:", domain);
      const supabase = createServiceClient();
      query = supabase.from("sites").select("*").eq("custom_domain", domain);
    }

    return unstable_cache(
      async () => {
        try {
          const result = await query.single();
          console.log("Site data result:", result);
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
