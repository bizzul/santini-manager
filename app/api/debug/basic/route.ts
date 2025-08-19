import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const debugInfo: any = {
            timestamp: new Date().toISOString(),
            note: "🔍 Basic debug endpoint - no authentication required",
            status: "✅ Endpoint accessible",
        };

        // Check environment variables
        debugInfo.environment = {
            node_env: process.env.NODE_ENV,
            root_domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
            has_supabase_url: !!process.env.STORAGE_SUPABASE_URL,
            has_anon_key: !!process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY,
            has_service_key: !!process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY,
            cookie_name: process.env.COOKIE_NAME ?? "reactive-app:session",
        };

        // Check request information
        debugInfo.request = {
            method: request.method,
            url: request.url,
            host: request.headers.get("host"),
            user_agent: request.headers.get("user-agent"),
            origin: request.headers.get("origin"),
            referer: request.headers.get("referer"),
        };

        // Check cookies (if any)
        try {
            const cookieStore = await import("next/headers").then((m) =>
                m.cookies()
            );
            const allCookies = cookieStore.getAll();

            debugInfo.cookies = {
                total_cookies: allCookies.length,
                all_cookie_names: allCookies.map((c) => c.name),
                has_auth_cookie: allCookies.some((c) =>
                    c.name ===
                        (process.env.COOKIE_NAME ?? "reactive-app:session")
                ),
                note: "Cookie information for debugging",
            };
        } catch (cookieError) {
            debugInfo.cookies = {
                error: "Could not check cookies",
                details: cookieError instanceof Error
                    ? cookieError.message
                    : "Unknown error",
            };
        }

        // Check if we can access Supabase (basic connection test)
        try {
            const { createClient } = await import("@/utils/supabase/server");
            const supabase = await createClient();

            // Test basic connection (this won't require auth)
            const { data, error } = await supabase.from("sites").select(
                "count",
                { count: "exact", head: true },
            );

            if (error) {
                debugInfo.supabase_connection = {
                    status: "❌ Connection failed",
                    error: error.message,
                    code: error.code,
                    note:
                        "This suggests a database connection or permission issue",
                };
            } else {
                debugInfo.supabase_connection = {
                    status: "✅ Connection successful",
                    note: "Basic database access is working",
                };
            }
        } catch (supabaseError) {
            debugInfo.supabase_connection = {
                status: "❌ Failed to create client",
                error: supabaseError instanceof Error
                    ? supabaseError.message
                    : "Unknown error",
                note: "This suggests a configuration issue with Supabase",
            };
        }

        // Add recommendations
        debugInfo.recommendations = {
            local_vs_production:
                "If this works locally but not in production, check:",
            checklist: [
                "Environment variables are set in Vercel",
                "NODE_ENV=production in Vercel",
                "Cookie domain matches your Vercel domain",
                "Supabase RLS policies allow Vercel IPs",
                "All required environment variables are present",
            ],
        };

        return NextResponse.json(debugInfo);
    } catch (error) {
        console.error("Error in basic debug endpoint:", error);
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
            status: 500,
            timestamp: new Date().toISOString(),
        });
    }
}
