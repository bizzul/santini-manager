import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");
    const next = requestUrl.searchParams.get("next") || "/";

    // Get the origin for redirects
    const origin = requestUrl.origin;

    console.log("[Auth Callback] Processing callback:", {
        code: !!code,
        token_hash: !!token_hash,
        type,
        next,
    });

    const supabase = await createClient();

    // Handle PKCE code exchange (for OAuth and magic link)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error(
                "[Auth Callback] Code exchange error:",
                error.message,
            );
            return NextResponse.redirect(
                `${origin}/auth/error?error=${
                    encodeURIComponent(error.message)
                }`,
            );
        }
    }

    // Handle token hash verification (for email invitations)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        });
        if (error) {
            console.error(
                "[Auth Callback] Token verification error:",
                error.message,
            );
            return NextResponse.redirect(
                `${origin}/auth/error?error=${
                    encodeURIComponent(error.message)
                }`,
            );
        }
    }

    // Get the current user after authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error(
            "[Auth Callback] Failed to get user:",
            userError?.message,
        );
        return NextResponse.redirect(`${origin}/login`);
    }

    console.log("[Auth Callback] User authenticated:", user.id, user.email);

    // Check if this is an invitation (user needs to complete signup)
    // Look up user in our User table to check if profile is complete
    const { data: userProfile, error: profileError } = await supabase
        .from("User")
        .select("authId, email, given_name, family_name, role, enabled")
        .eq("authId", user.id)
        .single();

    if (profileError && profileError.code !== "PGRST116") {
        console.error(
            "[Auth Callback] Profile lookup error:",
            profileError.message,
        );
    }

    console.log("[Auth Callback] User profile:", userProfile);

    // If this is an invite type and user profile doesn't exist or is not enabled
    if (type === "invite") {
        // Get user's organizations
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", user.id);

        const organizationIds = userOrgs?.map((uo) =>
            uo.organization_id
        ).join(",") || "";

        // Get user's sites (for regular users)
        const { data: userSites } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", user.id);

        const siteIds = userSites?.map((us) => us.site_id).join(",") || "";

        // Build redirect URL to complete-signup with user data
        // Use profile data if available, otherwise use user metadata from Supabase
        const completeSignupParams = new URLSearchParams({
            email: userProfile?.email || user.email || "",
            name: userProfile?.given_name || user.user_metadata?.name || "",
            last_name: userProfile?.family_name ||
                user.user_metadata?.last_name || "",
            role: userProfile?.role || user.user_metadata?.role || "user",
        });

        if (organizationIds) {
            completeSignupParams.set("organizations", organizationIds);
        }
        if (siteIds) {
            completeSignupParams.set("sites", siteIds);
        }

        console.log(
            "[Auth Callback] Redirecting to complete-signup with params:",
            completeSignupParams.toString(),
        );

        return NextResponse.redirect(
            `${origin}/auth/complete-signup?${completeSignupParams.toString()}`,
        );
    }

    // If user profile exists and is enabled, they're already set up
    if (userProfile && userProfile.enabled) {
        console.log(
            "[Auth Callback] User already enabled, redirecting to sites/select",
        );
        return NextResponse.redirect(`${origin}/sites/select`);
    }

    // If user profile exists but is not enabled, redirect to complete-signup
    if (userProfile && !userProfile.enabled) {
        // Get user's organizations
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", user.id);

        const organizationIds = userOrgs?.map((uo) =>
            uo.organization_id
        ).join(",") || "";

        // Get user's sites (for regular users)
        const { data: userSites } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", user.id);

        const siteIds = userSites?.map((us) => us.site_id).join(",") || "";

        const completeSignupParams = new URLSearchParams({
            email: userProfile.email || user.email || "",
            name: userProfile.given_name || user.user_metadata?.name || "",
            last_name: userProfile.family_name ||
                user.user_metadata?.last_name || "",
            role: userProfile.role || "user",
        });

        if (organizationIds) {
            completeSignupParams.set("organizations", organizationIds);
        }
        if (siteIds) {
            completeSignupParams.set("sites", siteIds);
        }

        return NextResponse.redirect(
            `${origin}/auth/complete-signup?${completeSignupParams.toString()}`,
        );
    }

    // For other flows, respect the next parameter
    const redirectPath = next.startsWith("/") ? next : "/sites/select";
    return NextResponse.redirect(`${origin}${redirectPath}`);
}
