import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

const log = logger.scope("QuickActionsData");

/**
 * API endpoint for Quick Actions - fetches data needed for project and timetracking forms
 * Query params:
 * - domain: The site domain (required)
 * - type: "project" | "timetracking" (required)
 */
export async function GET(req: NextRequest) {
    try {
        // Authentication check
        const userContext = await getUserContext();
        if (!userContext) {
            return NextResponse.json({ error: "Non autorizzato" }, {
                status: 401,
            });
        }

        const { searchParams } = new URL(req.url);
        const domain = searchParams.get("domain");
        const type = searchParams.get("type");

        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, {
                status: 400,
            });
        }

        if (!type || !["project", "timetracking", "product"].includes(type)) {
            return NextResponse.json({
                error:
                    "Valid type is required (project | timetracking | product)",
            }, { status: 400 });
        }

        // Get site ID from domain
        const siteResult = await getSiteData(domain);
        if (!siteResult?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        const siteId = siteResult.data.id;
        const supabase = await createClient();

        if (type === "project") {
            // Fetch data for project form
            const [clientsResult, productsResult, kanbansResult] = await Promise
                .all([
                    supabase
                        .from("Client")
                        .select("*")
                        .eq("site_id", siteId)
                        .order("businessName", { ascending: true }),
                    supabase
                        .from("SellProduct")
                        .select("*")
                        .eq("site_id", siteId)
                        .eq("active", true),
                    supabase
                        .from("Kanban")
                        .select("*")
                        .eq("site_id", siteId),
                ]);

            return NextResponse.json({
                clients: clientsResult.data || [],
                activeProducts: productsResult.data || [],
                kanbans: kanbansResult.data || [],
            });
        }

        if (type === "timetracking") {
            // Fetch data for timetracking form

            // Get tasks for the site
            const { data: tasks, error: tasksError } = await supabase
                .from("Task")
                .select("*")
                .eq("site_id", siteId)
                .eq("archived", false)
                .order("unique_code", { ascending: true });

            if (tasksError) {
                log.error("Error fetching tasks:", tasksError);
            }

            // Get users for the site through user_sites
            const { data: userSites, error: userSitesError } = await supabase
                .from("user_sites")
                .select("user_id")
                .eq("site_id", siteId);

            let users: any[] = [];
            if (!userSitesError && userSites?.length) {
                const userIds = userSites.map((us) => us.user_id);
                const { data: usersData, error: usersError } = await supabase
                    .from("User")
                    .select("*")
                    .eq("enabled", true)
                    .in("authId", userIds)
                    .order("family_name", { ascending: true });

                if (usersError) {
                    log.error("Error fetching users:", usersError);
                }
                users = usersData || [];
            }

            // Get roles for the site (site-specific and global)
            const [siteRolesResult, globalRolesResult] = await Promise.all([
                supabase.from("Roles").select("*").eq("site_id", siteId),
                supabase.from("Roles").select("*").is("site_id", null),
            ]);

            const siteRoles = siteRolesResult.data || [];
            const globalRoles = globalRolesResult.data || [];
            const allRoles = [...siteRoles, ...globalRoles].filter(
                (role, index, self) =>
                    index === self.findIndex((r) => r.id === role.id),
            );

            // Get internal activities (site-specific and global)
            const [siteActivitiesResult, globalActivitiesResult] = await Promise
                .all([
                    supabase
                        .from("internal_activities")
                        .select("id, code, label, site_id, sort_order")
                        .eq("site_id", siteId)
                        .eq("is_active", true)
                        .order("sort_order", { ascending: true }),
                    supabase
                        .from("internal_activities")
                        .select("id, code, label, site_id, sort_order")
                        .is("site_id", null)
                        .eq("is_active", true)
                        .order("sort_order", { ascending: true }),
                ]);

            const siteActivities = siteActivitiesResult.data || [];
            const globalActivities = globalActivitiesResult.data || [];
            const allActivities = [...siteActivities, ...globalActivities]
                .filter(
                    (activity, index, self) =>
                        index === self.findIndex((a) => a.id === activity.id),
                );

            return NextResponse.json({
                tasks: tasks || [],
                users,
                roles: allRoles,
                internalActivities: allActivities,
            });
        }

        if (type === "product") {
            // For product form, we just need the siteId
            return NextResponse.json({
                siteId,
            });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (err: unknown) {
        log.error("QuickActionsData API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}
