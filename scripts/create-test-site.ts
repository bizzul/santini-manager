import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    console.log(
        "Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set",
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestSite() {
    try {
        console.log("🚀 Creating test site...");

        // First, let's check if we have any organizations
        const { data: organizations, error: orgError } = await supabase
            .from("organizations")
            .select("*");

        if (orgError) {
            console.error("❌ Error fetching organizations:", orgError);
            return;
        }

        console.log("📋 Found organizations:", organizations);

        let organizationId: string;

        if (organizations && organizations.length > 0) {
            // Use the first organization
            organizationId = organizations[0].id;
            console.log("✅ Using existing organization:", organizationId);
        } else {
            // Create a test organization
            console.log("📋 Creating test organization...");
            const { data: organization, error: createOrgError } = await supabase
                .from("organizations")
                .insert([{ name: "Test Organization" }])
                .select()
                .single();

            if (createOrgError) {
                console.error(
                    "❌ Error creating organization:",
                    createOrgError,
                );
                return;
            }

            organizationId = organization.id;
            console.log("✅ Test organization created:", organizationId);
        }

        // Create the test site
        console.log("🌐 Creating test site with subdomain 'orgtest'...");
        const { data: site, error: siteError } = await supabase
            .from("sites")
            .insert([{
                name: "Test Site",
                description: "A test site for subdomain routing",
                subdomain: "orgtest",
                organization_id: organizationId,
            }])
            .select()
            .single();

        if (siteError) {
            console.error("❌ Error creating site:", siteError);
            return;
        }

        console.log("✅ Test site created successfully!");
        console.log("📋 Site details:", site);
        console.log("🌐 You can now access: orgtest.localhost:3000");
    } catch (error) {
        console.error("❌ Unexpected error:", error);
    }
}

createTestSite();
