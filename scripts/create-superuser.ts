import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.STORAGE_SUPABASE_URL!;
const supabaseServiceKey = process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperUser() {
    try {
        console.log("🚀 Creating first superuser...");

        // Step 1: Create the main organization
        console.log("📋 Creating main organization...");
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .insert([
                {
                    name: "OBMD Design",
                },
            ])
            .select()
            .single();

        if (orgError) {
            console.error("❌ Error creating organization:", orgError);
            return;
        }

        console.log("✅ Organization created:", organization.id);

        // Step 2: Create the superuser in Supabase Auth
        console.log("👤 Creating superuser in Auth...");
        const superuserEmail = "info@obmdesign.com"; // Change this to your email
        const superuserPassword = "Stefano12."; // Change this to a secure password

        const { data: userData, error: userError } = await supabase.auth.admin
            .createUser({
                email: superuserEmail,
                password: superuserPassword,
                email_confirm: true,
                user_metadata: {
                    role: "superadmin",
                    organization_id: organization.id,
                },
            });

        if (userError) {
            console.error("❌ Error creating user:", userError);
            return;
        }

        console.log("✅ Superuser created in Auth:", userData.user.id);

        // Step 3: Create tenant record with superadmin role
        console.log("🔗 Creating tenant record...");
        const { error: tenantError } = await supabase
            .from("tenants")
            .insert([
                {
                    organization_id: organization.id,
                    user_id: userData.user.id,
                    role: "superadmin",
                },
            ]);

        if (tenantError) {
            console.error("❌ Error creating tenant:", tenantError);
            return;
        }

        console.log("✅ Tenant record created");

        // Step 4: Create user profile in the User table
        console.log("👤 Creating user profile...");
        const { error: profileError } = await supabase
            .from("User")
            .insert([
                {
                    email: superuserEmail,
                    authId: userData.user.id,
                    given_name: "Omar",
                    family_name: "Beltraminelli",
                    enabled: true,
                },
            ]);

        if (profileError) {
            console.error("❌ Error creating user profile:", profileError);
            return;
        }

        console.log("✅ User profile created");

        console.log("\n🎉 Superuser setup complete!");
        console.log("📧 Email:", superuserEmail);
        console.log("🔑 Password:", superuserPassword);
        console.log("🏢 Organization ID:", organization.id);
        console.log("👤 User ID:", userData.user.id);
        console.log("\n⚠️  Please change the password after first login!");
    } catch (error) {
        console.error("❌ Unexpected error:", error);
    }
}

// Run the script
createSuperUser();
