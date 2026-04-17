import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { createServiceClient } from "@/utils/supabase/server";
import { resolveSiteVerticalProfile } from "@/lib/site-verticals";
import {
    COMMAND_DECK_SETTING_KEY,
    parseCommandDeckEnabled,
} from "@/lib/command-deck-settings";

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
        const { id, name, organization_id, image, logo } = response.data;
        const supabase = createServiceClient();
        // Batch the two site_settings reads so we never waterfall them.
        const [{ data: siteVertical }, { data: commandDeckSetting }] =
            await Promise.all([
                supabase
                    .from("site_settings")
                    .select("setting_value")
                    .eq("site_id", id)
                    .eq("setting_key", "vertical_profile")
                    .maybeSingle(),
                supabase
                    .from("site_settings")
                    .select("setting_value")
                    .eq("site_id", id)
                    .eq("setting_key", COMMAND_DECK_SETTING_KEY)
                    .maybeSingle(),
            ]);

        return NextResponse.json({
            id,
            name,
            organization_id,
            image,
            logo,
            verticalProfile: resolveSiteVerticalProfile(siteVertical?.setting_value),
            organization: {
                name: response.data.organization?.name || "",
            },
            commandDeckEnabled: parseCommandDeckEnabled(
                commandDeckSetting?.setting_value,
            ),
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
