import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; id: string }> }
) {
    try {
        const { domain, id } = await params;
        const siteResponse = await getSiteData(domain);
        if (!siteResponse?.data) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const siteId = siteResponse.data.id;
        const supabase = await createClient();
        const userContext = await getUserContext();
        if (!userContext || !isAdminOrSuperadmin(userContext.role)) {
            return NextResponse.json(
                { error: "Solo admin possono approvare/rifiutare richieste" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { status } = body;

        if (!status || !["approved", "rejected"].includes(status)) {
            return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
        }

        // Fetch the leave request
        const { data: leaveRequest, error: fetchError } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("id", id)
            .eq("site_id", siteId)
            .single();

        if (fetchError || !leaveRequest) {
            return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
        }

        if (leaveRequest.status !== "pending") {
            return NextResponse.json(
                { error: "Solo richieste in attesa possono essere modificate" },
                { status: 400 }
            );
        }

        // Update the leave request status
        const { error: updateError } = await supabase
            .from("leave_requests")
            .update({
                status,
                reviewed_by: userContext.userId,
                reviewed_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // If approved, create attendance entries for each day in the range
        if (status === "approved") {
            const start = new Date(leaveRequest.start_date);
            const end = new Date(leaveRequest.end_date);
            const entries = [];

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                // Skip weekends
                if (dayOfWeek === 0 || dayOfWeek === 6) continue;

                const dateStr = d.toISOString().split("T")[0];
                entries.push({
                    site_id: siteId,
                    user_id: leaveRequest.user_id,
                    date: dateStr,
                    status: leaveRequest.leave_type,
                    notes: leaveRequest.notes || null,
                    auto_detected: false,
                    created_by: userContext.userId,
                });
            }

            if (entries.length > 0) {
                const { error: insertError } = await supabase
                    .from("attendance_entries")
                    .upsert(entries, { onConflict: "site_id,user_id,date" });

                if (insertError) {
                    console.error("Error creating attendance entries:", insertError);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating leave request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
