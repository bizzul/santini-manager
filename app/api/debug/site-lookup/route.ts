import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { revalidateTag } from "next/cache";
import { getSiteData } from "@/lib/fetchers";

/**
 * Debug endpoint to diagnose site lookup issues
 *
 * GET /api/debug/site-lookup?subdomain=santini
 * GET /api/debug/site-lookup?subdomain=santini&revalidate=true
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const subdomain = searchParams.get("subdomain");
        const shouldRevalidate = searchParams.get("revalidate") === "true";

        if (!subdomain) {
            return NextResponse.json(
                { error: "Missing 'subdomain' query parameter" },
                { status: 400 },
            );
        }

        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";

        // If requested, revalidate the cache first
        if (shouldRevalidate) {
            try {
                revalidateTag(`${subdomain}-metadata`);
                console.log(
                    `[site-lookup] Revalidated cache tag: ${subdomain}-metadata`,
                );
            } catch (e) {
                console.error("[site-lookup] Failed to revalidate:", e);
            }
        }

        // Direct database query (bypasses cache)
        const supabase = createServiceClient();
        const directQuery = await supabase
            .from("sites")
            .select(
                "id, name, subdomain, organization_id, custom_domain, created_at",
            )
            .eq("subdomain", subdomain)
            .single();

        // Query via getSiteData (uses cache)
        const cachedResult = await getSiteData(subdomain);

        // List all sites for comparison
        const allSites = await supabase
            .from("sites")
            .select("subdomain, name")
            .order("subdomain");

        return NextResponse.json({
            subdomain,
            rootDomain,
            revalidated: shouldRevalidate,
            directQuery: {
                found: !!directQuery.data,
                data: directQuery.data,
                error: directQuery.error?.message || null,
            },
            cachedResult: {
                found: !!cachedResult?.data,
                data: cachedResult?.data
                    ? {
                        id: cachedResult.data.id,
                        name: cachedResult.data.name,
                        subdomain: cachedResult.data.subdomain,
                    }
                    : null,
                error: (cachedResult?.error as { message?: string })?.message ||
                    null,
            },
            allSites: allSites.data?.map((s) => ({
                subdomain: s.subdomain,
                name: s.name,
            })) || [],
            hints: directQuery.data
                ? "Site found! If you're still getting errors, try clearing the cache with ?revalidate=true"
                : `Site with subdomain '${subdomain}' not found in database. Available subdomains: ${
                    allSites.data?.map((s) => s.subdomain).join(", ") || "none"
                }`,
        });
    } catch (error) {
        console.error("[site-lookup] Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: String(error) },
            { status: 500 },
        );
    }
}
