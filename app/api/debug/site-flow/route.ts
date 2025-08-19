import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const testDomain = searchParams.get("domain");

        const debugInfo: any = {
            timestamp: new Date().toISOString(),
            note:
                "🔍 Site flow debug endpoint - tests the exact flow that happens when navigating to a site",
            test_domain: testDomain,
        };

        if (!testDomain) {
            debugInfo.error =
                "No domain parameter provided. Use ?domain=orgtest to test";
            return NextResponse.json(debugInfo);
        }

        // Step 1: Test getSiteData (same as site page)
        try {
            debugInfo.step1_getSiteData = "Testing getSiteData function...";
            const siteData = await getSiteData(testDomain);

            debugInfo.step1_result = {
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
            };

            if (!siteData?.data) {
                debugInfo.step1_error =
                    "Site data not found - would trigger notFound()";
                return NextResponse.json(debugInfo);
            }
        } catch (getSiteDataError) {
            debugInfo.step1_result = {
                success: false,
                error: getSiteDataError instanceof Error
                    ? getSiteDataError.message
                    : "Unknown error",
                stack: getSiteDataError instanceof Error
                    ? getSiteDataError.stack
                    : undefined,
            };
            return NextResponse.json(debugInfo);
        }

        // Step 2: Test getUserContext (same as site layout)
        try {
            debugInfo.step2_getUserContext =
                "Testing getUserContext function...";
            const userContext = await getUserContext();

            if (!userContext) {
                debugInfo.step2_result = {
                    success: false,
                    error: "User context not found - would redirect to login",
                };
                return NextResponse.json(debugInfo);
            }

            debugInfo.step2_result = {
                success: true,
                user: {
                    id: userContext.user.id,
                    email: userContext.user.email,
                    role: userContext.role,
                    organization_id: userContext.organizationId,
                },
            };
        } catch (getUserContextError) {
            debugInfo.step2_result = {
                success: false,
                error: getUserContextError instanceof Error
                    ? getUserContextError.message
                    : "Unknown error",
                stack: getUserContextError instanceof Error
                    ? getUserContextError.stack
                    : undefined,
            };
            return NextResponse.json(debugInfo);
        }

        // Step 3: Test the redirect URL construction
        try {
            debugInfo.step3_redirect = "Testing redirect URL construction...";
            const redirectUrl = `/sites/${testDomain}/dashboard`;

            debugInfo.step3_result = {
                success: true,
                redirect_url: redirectUrl,
                note: "This is the URL that the site page tries to redirect to",
            };
        } catch (redirectError) {
            debugInfo.step3_result = {
                success: false,
                error: redirectError instanceof Error
                    ? redirectError.message
                    : "Unknown error",
            };
            return NextResponse.json(debugInfo);
        }

        // Step 4: Test if the dashboard page exists and can be accessed
        try {
            debugInfo.step4_dashboard = "Testing dashboard page access...";

            // Simulate what happens when the dashboard page loads
            const { createClient } = await import("@/utils/supabase/server");
            const supabase = await createClient();

            // Test if we can access the sites table from the dashboard context
            const { data: dashboardSiteData, error: dashboardError } =
                await supabase
                    .from("sites")
                    .select("name, description")
                    .eq(
                        "subdomain",
                        testDomain.endsWith(
                                `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                            )
                            ? testDomain.replace(
                                `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
                                "",
                            )
                            : testDomain,
                    )
                    .single();

            if (dashboardError) {
                debugInfo.step4_result = {
                    success: false,
                    error: dashboardError.message,
                    code: dashboardError.code,
                    note:
                        "This suggests the dashboard page might have database access issues",
                };
            } else {
                debugInfo.step4_result = {
                    success: true,
                    data: dashboardSiteData,
                    note: "Dashboard page database access is working",
                };
            }
        } catch (dashboardError) {
            debugInfo.step4_result = {
                success: false,
                error: dashboardError instanceof Error
                    ? dashboardError.message
                    : "Unknown error",
                note: "This suggests the dashboard page has other issues",
            };
        }

        // Summary
        debugInfo.summary = {
            all_steps_passed: debugInfo.step1_result?.success &&
                debugInfo.step2_result?.success &&
                debugInfo.step3_result?.success &&
                debugInfo.step4_result?.success,
            note:
                "If all steps pass, the issue might be in the actual page rendering or middleware",
        };

        return NextResponse.json(debugInfo);
    } catch (error) {
        console.error("Error in site flow debug endpoint:", error);
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
            status: 500,
            timestamp: new Date().toISOString(),
        });
    }
}
