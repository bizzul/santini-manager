import { unstable_cache } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/server";

export async function getSiteData(domain: string) {
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

    // Use service client to bypass RLS for public site access
    const supabase = createServiceClient();
    query = supabase.from("sites").select("*").eq("subdomain", subdomain);
  } else {
    // It's a custom domain
    const supabase = createServiceClient();
    query = supabase.from("sites").select("*").eq("custom_domain", domain);
  }

  return unstable_cache(
    async () => {
      return await query.single();
    },
    [`${domain}-metadata`],
    {
      revalidate: 900,
      tags: [`${domain}-metadata`],
    },
  )();
}
