import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
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
        const userContext = await getUserContext();
        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const supabase = createServiceClient();

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
            .select(`
                id,
                employee_id,
                task_id,
                start_time,
                end_time,
                hours,
                minutes,
                description,
                activity_type,
                internal_activity,
                created_at,
                task:task_id(unique_code, title, name, Client:clientId(businessName, individualFirstName, individualLastName))
            `)
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

        const { data: siteUsers } = await supabase
            .from("user_sites")
            .select("user_id")
            .eq("site_id", siteId);

        const directSiteUserIds = siteUsers?.map((entry) => entry.user_id) || [];

        const { data: siteInfo } = await supabase
            .from("sites")
            .select("organization_id")
            .eq("id", siteId)
            .maybeSingle();

        let organizationUserIds: string[] = [];
        if (siteInfo?.organization_id) {
            const { data: organizationUsers } = await supabase
                .from("user_organizations")
                .select("user_id")
                .eq("organization_id", siteInfo.organization_id);

            organizationUserIds = organizationUsers?.map((entry) => entry.user_id) || [];
        }

        const directSiteUserSet = new Set(directSiteUserIds);
        const organizationUserSet = new Set(organizationUserIds);
        const attendanceUserIds = attendanceData?.map((entry) => entry.user_id).filter(Boolean) || [];
        const timetrackingUserIds = Object.values(employeeToAuthMap).filter(Boolean);
        const candidateUserIds = Array.from(
            new Set([
                ...directSiteUserIds,
                ...organizationUserIds,
                ...attendanceUserIds,
                ...timetrackingUserIds,
            ])
        );

        let userProfiles: any[] = [];
        if (candidateUserIds.length > 0) {
            const { data: authIdProfiles } = await supabase
                .from("User")
                .select("authId, given_name, family_name, email, picture, enabled, role")
                .in("authId", candidateUserIds);

            userProfiles = authIdProfiles || [];
        }

        const profiles: {
            id: string;
            name: string;
            email: string | null;
            picture: string | null;
        }[] = userProfiles
            .filter((user: any) => {
                if (!user?.enabled || user.role === "superadmin") {
                    return false;
                }

                const authUserId = user.authId || "";
                return (
                    directSiteUserSet.has(authUserId) ||
                    (organizationUserSet.has(authUserId) && user.role === "admin") ||
                    attendanceUserIds.includes(authUserId) ||
                    timetrackingUserIds.includes(authUserId)
                );
            })
            .map((user: any) => ({
                id: user.authId || "",
                name:
                    [user.given_name, user.family_name].filter(Boolean).join(" ") ||
                    user.email ||
                    "Unknown",
                email: user.email || null,
                picture: user.picture || null,
            }))
            .filter((user) => Boolean(user.id));

        const userIds = profiles.map((user) => user.id);
        const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

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

        const timetrackingEntries = (timetrackingData || [])
            .map((entry) => {
                const authId = employeeToAuthMap[entry.employee_id];
                if (!authId) return null;
                const profile = profilesById.get(authId);
                return {
                    id: entry.id,
                    userId: authId,
                    userName: profile?.name || "Collaboratore",
                    userPicture: profile?.picture || null,
                    employeeId: entry.employee_id,
                    task_id: entry.task_id,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    hours: entry.hours,
                    minutes: entry.minutes,
                    description: entry.description,
                    activity_type: entry.activity_type,
                    internal_activity: entry.internal_activity,
                    created_at: entry.created_at,
                    task: entry.task,
                };
            })
            .filter(Boolean);

        return NextResponse.json({
            attendance,
            users: profiles,
            timetrackingEntries,
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
            "smart_working", "formazione", "assenza_privata", "ipg",
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
