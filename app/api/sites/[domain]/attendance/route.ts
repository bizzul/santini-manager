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
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
        const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

        let startDate: string;
        let endDate: string;

        if (month !== null) {
            startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
        } else {
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
        }

        // Fetch manual attendance entries
        const { data: attendanceData, error: attendanceError } = await supabase
            .from("attendance_entries")
            .select("user_id, date, status, notes, auto_detected")
            .eq("site_id", siteId)
            .gte("date", startDate)
            .lte("date", endDate);

        if (attendanceError) {
            return NextResponse.json({ error: attendanceError.message }, { status: 500 });
        }

        // Fetch timetracking data to auto-detect "presente" days
        const { data: timetrackingData, error: ttError } = await supabase
            .from("Timetracking")
            .select("employee_id, created_at, hours, minutes")
            .eq("site_id", siteId)
            .gte("created_at", `${startDate}T00:00:00`)
            .lte("created_at", `${endDate}T23:59:59`);

        if (ttError) {
            return NextResponse.json({ error: ttError.message }, { status: 500 });
        }

        // Map employee_id (internal User.id) to auth user_id
        const employeeIds = Array.from(new Set(timetrackingData?.map((t) => t.employee_id).filter(Boolean)));
        let employeeToAuthMap: Record<number, string> = {};

        if (employeeIds.length > 0) {
            const { data: users } = await supabase
                .from("User")
                .select("id, authId")
                .in("id", employeeIds);

            if (users) {
                employeeToAuthMap = Object.fromEntries(
                    users.map((u) => [u.id, u.authId])
                );
            }
        }

        // Build timetracking presence map: { authUserId: Set<date> }
        const ttPresence: Record<string, Set<string>> = {};
        timetrackingData?.forEach((entry) => {
            const authId = employeeToAuthMap[entry.employee_id];
            if (!authId) return;
            const dateStr = entry.created_at.split("T")[0];
            if (!ttPresence[authId]) ttPresence[authId] = new Set();
            ttPresence[authId].add(dateStr);
        });

        // Build manual entries map: { userId: { date: { status, notes } } }
        const manualMap: Record<string, Record<string, { status: string; notes: string | null }>> = {};
        attendanceData?.forEach((entry) => {
            if (!manualMap[entry.user_id]) manualMap[entry.user_id] = {};
            manualMap[entry.user_id][entry.date] = {
                status: entry.status,
                notes: entry.notes,
            };
        });

        // Fetch all users for this site
        const { data: siteUsers } = await supabase
            .from("user_sites")
            .select("user_id")
            .eq("site_id", siteId);

        const userIds = siteUsers?.map((su) => su.user_id) || [];

        // Fetch user profiles
        const { data: userProfiles } = await supabase
            .from("User")
            .select("authId, given_name, family_name, email, picture")
            .in("authId", userIds);

        const profiles = (userProfiles || []).map((u) => ({
            id: u.authId,
            name: [u.given_name, u.family_name].filter(Boolean).join(" ") || u.email || "Unknown",
            email: u.email,
            picture: u.picture,
        }));

        // Merge: manual entries take priority over auto-detected
        const attendance: Record<string, Record<string, { status: string; notes: string | null; autoDetected: boolean }>> = {};

        for (const userId of userIds) {
            attendance[userId] = {};

            // First add auto-detected presence from timetracking
            if (ttPresence[userId]) {
                ttPresence[userId].forEach((dateStr) => {
                    attendance[userId][dateStr] = {
                        status: "presente",
                        notes: null,
                        autoDetected: true,
                    };
                });
            }

            // Then override with manual entries (they take priority)
            if (manualMap[userId]) {
                Object.entries(manualMap[userId]).forEach(([dateStr, entry]) => {
                    attendance[userId][dateStr] = {
                        status: entry.status,
                        notes: entry.notes,
                        autoDetected: false,
                    };
                });
            }
        }

        return NextResponse.json({
            attendance,
            users: profiles,
            year,
            month,
        });
    } catch (error) {
        console.error("Error fetching attendance:", error);
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
        if (!userContext || !isAdminOrSuperadmin(userContext.role)) {
            return NextResponse.json({ error: "Solo admin possono modificare le presenze" }, { status: 403 });
        }

        const body = await request.json();
        const { user_id, date, status, notes } = body;

        if (!user_id || !date || !status) {
            return NextResponse.json({ error: "user_id, date e status sono obbligatori" }, { status: 400 });
        }

        const validStatuses = [
            "presente", "vacanze", "malattia", "infortunio",
            "smart_working", "formazione", "assenza_privata",
        ];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("attendance_entries")
            .upsert(
                {
                    site_id: siteId,
                    user_id,
                    date,
                    status,
                    notes: notes || null,
                    auto_detected: false,
                    created_by: userContext.userId,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "site_id,user_id,date" }
            )
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error updating attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
