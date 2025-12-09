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
            return NextResponse.json({ error: "Non autorizzato" }, {
                status: 401,
            });
        }

        const { id: organizationId } = await params;

        // Check if user has access to this organization
        const hasAccess = await canAccessOrganization(organizationId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
        }

        // Fetch sites for this organization
        const { data: sites, error: sitesError } = await supabase
            .from("sites")
            .select("id, name, subdomain")
            .eq("organization_id", organizationId)
            .order("name");

        if (sitesError) {
            console.error("Error fetching sites:", sitesError);
            return NextResponse.json(
                { error: "Errore nel caricamento dei siti" },
                { status: 500 },
            );
        }

        return NextResponse.json({ sites: sites || [] });
    } catch (error) {
        console.error("Error fetching organization sites:", error);
        return NextResponse.json(
            { error: "Errore interno del server" },
            { status: 500 },
        );
    }
}

