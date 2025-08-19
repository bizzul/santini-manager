/**
 * Test script to verify Vercel deployment setup
 * Run this locally to check if your environment is properly configured
 */

export async function testVercelSetup() {
    console.log("🔍 Testing Vercel deployment setup...\n");

    // Check environment variables
    console.log("📋 Environment Variables Check:");
    const requiredVars = [
        "STORAGE_SUPABASE_URL",
        "STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "STORAGE_SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_ROOT_DOMAIN",
        "NODE_ENV",
    ];

    let allVarsPresent = true;
    requiredVars.forEach((varName) => {
        const value = process.env[varName];
        if (value) {
            console.log(
                `  ✅ ${varName}: ${
                    varName.includes("KEY") ? "***" + value.slice(-4) : value
                }`,
            );
        } else {
            console.log(`  ❌ ${varName}: Missing`);
            allVarsPresent = false;
        }
    });

    if (!allVarsPresent) {
        console.log("\n⚠️  Some required environment variables are missing!");
        console.log(
            "   Make sure to set them in your Vercel project settings.\n",
        );
    } else {
        console.log("\n✅ All required environment variables are present!\n");
    }

    // Check domain configuration
    console.log("🌐 Domain Configuration:");
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    if (rootDomain) {
        if (rootDomain.includes("localhost")) {
            console.log(`  ⚠️  Root domain is set to: ${rootDomain}`);
            console.log("     This will work locally but not on Vercel!");
            console.log(
                "     For Vercel, use your actual domain (e.g., your-app.vercel.app)",
            );
        } else {
            console.log(`  ✅ Root domain: ${rootDomain}`);
            console.log("     This should work on Vercel");
        }
    }

    // Check environment
    console.log("\n🏗️  Environment:");
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === "production") {
        console.log("  ✅ NODE_ENV is set to production");
    } else {
        console.log(`  ⚠️  NODE_ENV is set to: ${nodeEnv || "undefined"}`);
        console.log("     For Vercel, this should be 'production'");
    }

    // Recommendations
    console.log("\n📝 Recommendations for Vercel:");
    console.log("1. Set NODE_ENV=production in Vercel environment variables");
    console.log(
        "2. Ensure NEXT_PUBLIC_ROOT_DOMAIN is your actual Vercel domain",
    );
    console.log("3. Check that all Supabase keys are correct");
    console.log("4. Verify Supabase RLS policies allow Vercel IPs");
    console.log("5. Test the debug endpoint: /api/debug/user-context");

    console.log("\n🔧 After deployment, use these debugging steps:");
    console.log("1. Visit /api/debug/user-context to see detailed auth info");
    console.log("2. Check Vercel function logs for errors");
    console.log("3. Compare environment variables between local and Vercel");
    console.log("4. Test with a fresh browser session (clear cookies)");

    return allVarsPresent;
}

// Example usage:
// await testVercelSetup();
