import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";

/**
 * Debug endpoint to check Vercel environment and Supabase connection
 *
 * GET /api/debug/vercel-env
 */
export async function GET(request: NextRequest) {
    try {
        // Check environment variables (without exposing secrets)
        const envCheck = {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            STORAGE_SUPABASE_URL: !!process.env.STORAGE_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env
                .NEXT_PUBLIC_SUPABASE_ANON_KEY,
            STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env
                .STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY,
            STORAGE_SUPABASE_SERVICE_ROLE_KEY: !!process.env
                .STORAGE_SUPABASE_SERVICE_ROLE_KEY,
            NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
                "NOT SET",
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: !!process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET",
            VERCEL_REGION: process.env.VERCEL_REGION || "NOT SET",
        };

        // Check which Supabase URL is being used
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
            process.env.STORAGE_SUPABASE_URL;
        const serviceKeyPresent = !!process.env
            .STORAGE_SUPABASE_SERVICE_ROLE_KEY;
        const serviceKeyLength =
            process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY?.length || 0;

        // Test Supabase connection with service client
        let supabaseTest = {
            success: false,
            error: null as string | null,
            sitesCount: 0,
        };

        try {
            const supabase = createServiceClient();

            // Try a simple query
            const { data, error, count } = await supabase
                .from("sites")
                .select("id", { count: "exact" })
                .limit(1);

            if (error) {
                supabaseTest.error = error.message;
            } else {
                supabaseTest.success = true;
                supabaseTest.sitesCount = count || 0;
            }
        } catch (e) {
            supabaseTest.error = String(e);
        }

        // Get request info
        const requestInfo = {
            url: request.url,
            host: request.headers.get("host"),
            xForwardedFor: request.headers.get("x-forwarded-for"),
            xVercelId: request.headers.get("x-vercel-id"),
            userAgent: request.headers.get("user-agent")?.slice(0, 50),
        };

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            environment: envCheck,
            supabase: {
                urlConfigured: !!supabaseUrl,
                urlPreview: supabaseUrl?.slice(0, 30) + "...",
                serviceKeyPresent,
                serviceKeyLength,
                connectionTest: supabaseTest,
            },
            request: requestInfo,
            hints: !serviceKeyPresent
                ? "⚠️ STORAGE_SUPABASE_SERVICE_ROLE_KEY is not set! This will cause site lookups to fail."
                : supabaseTest.success
                ? "✅ Supabase connection is working"
                : `❌ Supabase connection failed: ${supabaseTest.error}`,
        });
    } catch (error) {
        console.error("[vercel-env] Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: String(error) },
            { status: 500 },
        );
    }
}
