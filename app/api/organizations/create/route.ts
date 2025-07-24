import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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
        const organizationName = formData.get("organizationName") as string;
        const organizationCode = formData.get("organizationCode") as string;

        if (!organizationName) {
            return NextResponse.json(
                { error: "Organization name is required" },
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

        // Create organization
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .insert({
                name: organizationName,
                code: organizationCode || generateOrganizationCode(),
            })
            .select()
            .single();

        if (orgError) {
            console.error("Error creating organization:", orgError);
            return NextResponse.json(
                { error: "Failed to create organization" },
                { status: 500 },
            );
        }

        // Create tenant record for the user as admin
        const { error: tenantError } = await supabase
            .from("tenants")
            .insert({
                organization_id: organization.id,
                user_id: user.id,
                role: "admin",
            });

        if (tenantError) {
            console.error("Error creating tenant:", tenantError);
            return NextResponse.json({ error: "Failed to create tenant" }, {
                status: 500,
            });
        }

        // Redirect to the app
        return NextResponse.redirect(new URL("/app", request.url));
    } catch (error) {
        console.error("Error in create organization:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}

function generateOrganizationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
