import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);

        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        const supabase = await createClient();

        // Get AI settings for this site
        const { data: settings, error } = await supabase
            .from("site_ai_settings")
            .select("*")
            .eq("site_id", response.data.id)
            .single();

        // If no settings exist yet, return defaults
        if (error && error.code === "PGRST116") {
            return NextResponse.json({
                aiProvider: "openai",
                aiModel: "gpt-4o-mini",
                speechProvider: "web-speech",
                hasAiApiKey: false,
                hasWhisperApiKey: false,
            });
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return settings without exposing full API keys
        return NextResponse.json({
            aiProvider: settings.ai_provider || "openai",
            aiModel: settings.ai_model || "gpt-4o-mini",
            speechProvider: settings.speech_provider || "web-speech",
            hasAiApiKey: !!settings.ai_api_key,
            hasWhisperApiKey: !!settings.whisper_api_key,
            // Show masked version of API keys (last 4 chars)
            aiApiKeyMasked: settings.ai_api_key
                ? `...${settings.ai_api_key.slice(-4)}`
                : null,
            whisperApiKeyMasked: settings.whisper_api_key
                ? `...${settings.whisper_api_key.slice(-4)}`
                : null,
        });
    } catch (error) {
        console.error("Error fetching AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);

        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        const supabase = await createClient();

        // Check if user is authenticated
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Check if user has admin/owner role for this site or is superadmin
        const { data: userProfile } = await supabase
            .from("User")
            .select("role")
            .eq("authId", user.id)
            .single();

        const isSuperadmin = userProfile?.role === "superadmin";

        if (!isSuperadmin) {
            // Check if user has access to this site via user_sites or user_organizations
            const { data: userSite } = await supabase
                .from("user_sites")
                .select("site_id")
                .eq("user_id", user.id)
                .eq("site_id", response.data.id)
                .single();

            const { data: userOrg } = await supabase
                .from("user_organizations")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("organization_id", response.data.organization_id)
                .single();

            if (!userSite && !userOrg) {
                return NextResponse.json(
                    { error: "Non hai accesso a questo sito" },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const {
            aiProvider,
            aiModel,
            speechProvider,
            aiApiKey,
            whisperApiKey,
        } = body;

        // Prepare update data
        const updateData: Record<string, unknown> = {
            site_id: response.data.id,
        };

        if (aiProvider !== undefined) {
            updateData.ai_provider = aiProvider;
        }
        if (aiModel !== undefined) {
            updateData.ai_model = aiModel;
        }
        if (speechProvider !== undefined) {
            updateData.speech_provider = speechProvider;
        }
        // Only update API keys if a new value is provided (not empty string)
        if (aiApiKey && aiApiKey.trim() !== "") {
            updateData.ai_api_key = aiApiKey.trim();
        }
        if (whisperApiKey && whisperApiKey.trim() !== "") {
            updateData.whisper_api_key = whisperApiKey.trim();
        }

        // Upsert settings
        const { error } = await supabase.from("site_ai_settings").upsert(
            updateData,
            { onConflict: "site_id" }
        );

        if (error) {
            console.error("Error updating AI settings:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}

// DELETE endpoint to clear API keys
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);

        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        const supabase = await createClient();

        // Check auth and permissions (same as PUT)
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const { data: userProfile } = await supabase
            .from("User")
            .select("role")
            .eq("authId", user.id)
            .single();

        const isSuperadmin = userProfile?.role === "superadmin";

        if (!isSuperadmin) {
            // Check if user has access to this site via user_sites or user_organizations
            const { data: userSite } = await supabase
                .from("user_sites")
                .select("site_id")
                .eq("user_id", user.id)
                .eq("site_id", response.data.id)
                .single();

            const { data: userOrg } = await supabase
                .from("user_organizations")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("organization_id", response.data.organization_id)
                .single();

            if (!userSite && !userOrg) {
                return NextResponse.json(
                    { error: "Non hai accesso a questo sito" },
                    { status: 403 }
                );
            }
        }

        const url = new URL(request.url);
        const keyType = url.searchParams.get("keyType"); // 'ai' or 'whisper'

        if (keyType === "ai") {
            await supabase
                .from("site_ai_settings")
                .update({ ai_api_key: null })
                .eq("site_id", response.data.id);
        } else if (keyType === "whisper") {
            await supabase
                .from("site_ai_settings")
                .update({ whisper_api_key: null })
                .eq("site_id", response.data.id);
        } else {
            // Delete entire settings record
            await supabase
                .from("site_ai_settings")
                .delete()
                .eq("site_id", response.data.id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
