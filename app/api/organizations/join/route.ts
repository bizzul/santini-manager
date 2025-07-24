import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const formData = await request.formData();
        const organizationCode = formData.get("organizationCode") as string;

        if (!organizationCode) {
            return NextResponse.json(
                { error: "Organization code is required" },
                { status: 400 },
            );
        }

        // Check if user already has a tenant assignment
        const { data: existingTenant } = await supabase
            .from("tenants")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (existingTenant) {
            return NextResponse.json({
                error: "User already belongs to an organization",
            }, { status: 400 });
        }

        // Find organization by code
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("*")
            .eq("code", organizationCode)
            .single();

        if (orgError || !organization) {
            return NextResponse.json({ error: "Invalid organization code" }, {
                status: 400,
            });
        }

        // Create tenant record for the user as regular user
        const { error: tenantError } = await supabase
            .from("tenants")
            .insert({
                organization_id: organization.id,
                user_id: user.id,
                role: "user",
            });

        if (tenantError) {
            console.error("Error creating tenant:", tenantError);
            return NextResponse.json({ error: "Failed to join organization" }, {
                status: 500,
            });
        }

        // Redirect to the app
        return NextResponse.redirect(new URL("/app", request.url));
    } catch (error) {
        console.error("Error in join organization:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
