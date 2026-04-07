import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { createServiceClient } from "@/utils/supabase/server";
import { resolveSiteVerticalProfile } from "@/lib/site-verticals";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> },
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);
        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }
        const { id, name, organization_id, image } = response.data;
        const supabase = createServiceClient();
        const { data: siteVertical } = await supabase
            .from("site_settings")
            .select("setting_value")
            .eq("site_id", id)
            .eq("setting_key", "vertical_profile")
            .maybeSingle();

        return NextResponse.json({
            id,
            name,
            organization_id,
            image,
            verticalProfile: resolveSiteVerticalProfile(siteVertical?.setting_value),
            organization: {
                name: response.data.organization?.name || "",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
