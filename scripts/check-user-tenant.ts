import { createClient } from "../utils/supabase/server";

/**
 * Script to check if a user has the necessary tenant record
 * Run this to debug authentication issues
 */
export async function checkUserTenant(userEmail: string) {
    try {
        console.log(`Checking tenant record for user: ${userEmail}`);

        const supabase = await createClient();

        // First, get the user from auth
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();

        if (authError) {
            console.error("Auth error:", authError);
            return;
        }

        if (!user) {
            console.log("No authenticated user found");
            return;
        }

        console.log("Authenticated user:", {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
        });

        // Check if user exists in tenants table
        const { data: tenantData, error: tenantError } = await supabase
            .from("tenants")
            .select("*, organizations(*)")
            .eq("user_id", user.id)
            .single();

        if (tenantError) {
            if (tenantError.code === "PGRST116") {
                console.log("❌ No tenant record found for user");
                console.log(
                    "This means the user needs to be added to an organization",
                );
                console.log("You can either:");
                console.log(
                    "1. Create a tenant record manually in the database",
                );
                console.log("2. Use the organization creation flow");
                console.log("3. Add the user to an existing organization");
            } else {
                console.error("Error fetching tenant data:", tenantError);
            }
            return;
        }

        if (tenantData) {
            console.log("✅ Tenant record found:", {
                id: tenantData.id,
                role: tenantData.role,
                organization_id: tenantData.organization_id,
                organization_name: tenantData.organizations?.name,
                created_at: tenantData.created_at,
            });
        }

        // Check if user has access to any sites
        const { data: sitesData, error: sitesError } = await supabase
            .from("sites")
            .select("*")
            .eq("organization_id", tenantData?.organization_id);

        if (sitesError) {
            console.error("Error fetching sites:", sitesError);
            return;
        }

        if (sitesData && sitesData.length > 0) {
            console.log(
                "✅ User has access to sites:",
                sitesData.map((site) => ({
                    name: site.name,
                    subdomain: site.subdomain,
                    custom_domain: site.custom_domain,
                })),
            );
        } else {
            console.log("❌ No sites found for user's organization");
        }
    } catch (error) {
        console.error("Error in checkUserTenant:", error);
    }
}

// Example usage:
// await checkUserTenant("user@example.com");
