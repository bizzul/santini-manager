import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canAccessOrganization } from "@/lib/auth-utils";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const { id: organizationId } = await params;

        // Check if user has access to this organization
        const hasAccess = await canAccessOrganization(organizationId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch organization details
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, created_at")
            .eq("id", organizationId)
            .single();

        console.log("organization", organization);

        if (orgError || !organization) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(organization);
    } catch (error) {
        console.error("Error fetching organization:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
