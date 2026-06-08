import type { createClient } from "@/utils/supabase/server";

export async function userCanAccessSite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  siteId: string,
  organizationId: string | null,
): Promise<boolean> {
  const { data: userProfile } = await supabase
    .from("User")
    .select("role")
    .eq("authId", userId)
    .single();

  if (userProfile?.role === "superadmin") return true;

  const { data: userSite } = await supabase
    .from("user_sites")
    .select("site_id")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (userSite) return true;

  if (organizationId) {
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (userOrg) return true;
  }

  return false;
}
