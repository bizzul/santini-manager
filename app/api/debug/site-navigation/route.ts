import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const testDomain = searchParams.get("domain");

        const debugInfo: any = {
            timestamp: new Date().toISOString(),
            note:
                "🔍 Site navigation debug endpoint - tests getSiteData function",
            test_domain: testDomain,
        };

        if (!testDomain) {
            debugInfo.error =
                "No domain parameter provided. Use ?domain=orgtest to test";
            return NextResponse.json(debugInfo);
        }

        // Test the getSiteData function with the provided domain
        try {
            debugInfo.test_start = "Testing getSiteData function...";

            const siteData = await getSiteData(testDomain);

            debugInfo.getSiteData_result = {
                success: true,
                has_data: !!siteData?.data,
                data: siteData?.data
                    ? {
                        id: siteData.data.id,
                        name: siteData.data.name,
                        subdomain: siteData.data.subdomain,
                        custom_domain: siteData.data.custom_domain,
                        organization_id: siteData.data.organization_id,
                    }
                    : null,
                raw_response: siteData,
            };

            // Test what the domain parameter looks like
            debugInfo.domain_analysis = {
                original_domain: testDomain,
                is_subdomain: testDomain.endsWith(
                    `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                ),
                root_domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
                expected_subdomain:
                    testDomain.endsWith(
                            `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                        )
                        ? testDomain.replace(
                            `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                            "",
                        )
                        : null,
            };

            // Test if we can access the sites table directly
            try {
                const { createClient } = await import(
                    "@/utils/supabase/server"
                );
                const supabase = await createClient();

                // Test subdomain lookup
                if (
                    testDomain.endsWith(
                        `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                    )
                ) {
                    const subdomain = testDomain.replace(
                        `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                        "",
                    );
                    const { data: subdomainData, error: subdomainError } =
                        await supabase
                            .from("sites")
                            .select("*")
                            .eq("subdomain", subdomain)
                            .single();

                    debugInfo.direct_subdomain_lookup = {
                        subdomain: subdomain,
                        success: !subdomainError,
                        data: subdomainData,
                        error: subdomainError?.message,
                    };
                }

                // Test custom domain lookup
                const { data: customDomainData, error: customDomainError } =
                    await supabase
                        .from("sites")
                        .select("*")
                        .eq("custom_domain", testDomain)
                        .single();

                debugInfo.direct_custom_domain_lookup = {
                    success: !customDomainError,
                    data: customDomainData,
                    error: customDomainError?.message,
                };
            } catch (dbError) {
                debugInfo.direct_lookup_error = {
                    error: dbError instanceof Error
                        ? dbError.message
                        : "Unknown error",
                };
            }
        } catch (getSiteDataError) {
            debugInfo.getSiteData_result = {
                success: false,
                error: getSiteDataError instanceof Error
                    ? getSiteDataError.message
                    : "Unknown error",
                stack: getSiteDataError instanceof Error
                    ? getSiteDataError.stack
                    : undefined,
            };
        }

        return NextResponse.json(debugInfo);
    } catch (error) {
        console.error("Error in site navigation debug endpoint:", error);
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
            status: 500,
            timestamp: new Date().toISOString(),
        });
    }
}
