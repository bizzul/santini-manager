import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const siteResponse = await getSiteData(domain);
        if (!siteResponse?.data) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const siteId = siteResponse.data.id;
        const supabase = await createClient();
        const userContext = await getUserContext();
        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get("status");
        const userFilter = searchParams.get("user_id");

        let query = supabase
            .from("leave_requests")
            .select("*")
            .eq("site_id", siteId)
            .order("created_at", { ascending: false });

        if (statusFilter) {
            query = query.eq("status", statusFilter);
        }

        // Non-admin users can only see their own requests
        if (!isAdminOrSuperadmin(userContext.role)) {
            query = query.eq("user_id", userContext.userId);
        } else if (userFilter) {
            query = query.eq("user_id", userFilter);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch user profiles for the requests
        const userIds = Array.from(new Set(data?.map((r) => r.user_id) || []));
        let profiles: Record<string, { name: string; email: string | null }> = {};

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from("User")
                .select("authId, given_name, family_name, email")
                .in("authId", userIds);

            if (users) {
                profiles = Object.fromEntries(
                    users.map((u) => [
                        u.authId,
                        {
                            name: [u.given_name, u.family_name].filter(Boolean).join(" ") || u.email || "Unknown",
                            email: u.email,
                        },
                    ])
                );
            }
        }

        const enrichedData = (data || []).map((req) => ({
            ...req,
            user_name: profiles[req.user_id]?.name || "Unknown",
            user_email: profiles[req.user_id]?.email || null,
        }));

        return NextResponse.json({ requests: enrichedData });
    } catch (error) {
        console.error("Error fetching leave requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const siteResponse = await getSiteData(domain);
        if (!siteResponse?.data) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const siteId = siteResponse.data.id;
        const supabase = await createClient();
        const userContext = await getUserContext();
        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { leave_type, start_date, end_date, notes } = body;

        if (!leave_type || !start_date || !end_date) {
            return NextResponse.json(
                { error: "leave_type, start_date e end_date sono obbligatori" },
                { status: 400 }
            );
        }

        const validTypes = [
            "vacanze",
            "malattia",
            "infortunio",
            "smart_working",
            "formazione",
            "assenza_privata",
            "ipg",
        ];
        if (!validTypes.includes(leave_type)) {
            return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
        }

        if (new Date(start_date) > new Date(end_date)) {
            return NextResponse.json(
                { error: "La data di inizio deve essere precedente alla data di fine" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("leave_requests")
            .insert({
                site_id: siteId,
                user_id: userContext.userId,
                leave_type,
                start_date,
                end_date,
                notes: notes || null,
                status: "pending",
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error creating leave request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
