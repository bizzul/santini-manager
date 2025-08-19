import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
    try {
        // Use regular client to get user session from cookies
        const supabase = await createClient();

        // Get the current user from Supabase auth
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();

        if (authError) {
            return NextResponse.json({
                error: "Auth error",
                details: authError.message,
                status: 401,
                note:
                    "This error often occurs in production when cookies aren't properly set or retrieved",
            });
        }

        if (!user) {
            return NextResponse.json({
                error: "No authenticated user",
                status: 401,
                note: "User is not logged in or session has expired",
            });
        }

        const debugInfo: any = {
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
            },
            auth: "✅ User authenticated successfully",
            note:
                "🔍 This endpoint helps debug authentication issues. If this works locally but not on Vercel, check environment variables and database permissions.",
            session_info: {
                has_session: !!user,
                user_id: user.id,
                email: user.email,
            },
        };

        // Check if user exists in tenants table
        try {
            const { data: tenantData, error: tenantError } = await supabase
                .from("tenants")
                .select("*, organizations(*)")
                .eq("user_id", user.id)
                .single();

            if (tenantError) {
                if (tenantError.code === "PGRST116") {
                    debugInfo.tenant = {
                        status: "❌ No tenant record found",
                        error: "User needs to be added to an organization",
                        code: tenantError.code,
                        solution:
                            "Create a tenant record or use organization creation flow",
                    };
                } else {
                    debugInfo.tenant = {
                        status: "❌ Error fetching tenant data",
                        error: tenantError.message,
                        code: tenantError.code,
                        solution: "Check database permissions and RLS policies",
                    };
                }
            } else if (tenantData) {
                debugInfo.tenant = {
                    status: "✅ Tenant record found",
                    data: {
                        id: tenantData.id,
                        role: tenantData.role,
                        organization_id: tenantData.organization_id,
                        organization_name: tenantData.organizations?.name,
                    },
                };

                // Check if user has access to any sites
                try {
                    const { data: sitesData, error: sitesError } =
                        await supabase
                            .from("sites")
                            .select("*")
                            .eq("organization_id", tenantData.organization_id);

                    if (sitesError) {
                        debugInfo.sites = {
                            status: "❌ Error fetching sites",
                            error: sitesError.message,
                            solution:
                                "Check sites table permissions and RLS policies",
                        };
                    } else if (sitesData && sitesData.length > 0) {
                        debugInfo.sites = {
                            status: "✅ Sites found",
                            count: sitesData.length,
                            sites: sitesData.map((site) => ({
                                name: site.name,
                                subdomain: site.subdomain,
                                custom_domain: site.custom_domain,
                            })),
                        };
                    } else {
                        debugInfo.sites = {
                            status: "❌ No sites found",
                            message: "User's organization has no sites",
                            solution: "Create a site for this organization",
                        };
                    }
                } catch (sitesError) {
                    debugInfo.sites = {
                        status: "❌ Exception fetching sites",
                        error: sitesError instanceof Error
                            ? sitesError.message
                            : "Unknown error",
                        solution: "Check database connection and permissions",
                    };
                }
            }
        } catch (tenantException) {
            debugInfo.tenant = {
                status: "❌ Exception in tenant check",
                error: tenantException instanceof Error
                    ? tenantException.message
                    : "Unknown error",
                solution: "Check database connection and table structure",
            };
        }

        // Add environment info for debugging
        debugInfo.environment = {
            node_env: process.env.NODE_ENV,
            root_domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
            has_supabase_url: !!process.env.STORAGE_SUPABASE_URL,
            has_service_key: !!process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY,
        };

        // Add cookie debugging info
        try {
            const cookieStore = await import("next/headers").then((m) =>
                m.cookies()
            );
            const cookieName = process.env.COOKIE_NAME ??
                "reactive-app:session";
            const authCookie = cookieStore.get(cookieName);
            debugInfo.cookies = {
                has_auth_cookie: !!authCookie,
                cookie_name: cookieName,
                cookie_value_length: authCookie?.value?.length || 0,
                note: "Cookie presence helps debug session issues",
            };
        } catch (cookieError) {
            debugInfo.cookies = {
                error: "Could not check cookies",
                details: cookieError instanceof Error
                    ? cookieError.message
                    : "Unknown error",
            };
        }

        return NextResponse.json(debugInfo);
    } catch (error) {
        console.error("Error in debug endpoint:", error);
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
            status: 500,
        });
    }
}
