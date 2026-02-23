// pages/api/protected-route.js
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin privileges
    const userContext = await getUserContext();
    if (
      !userContext ||
      (userContext.role !== "admin" && userContext.role !== "superadmin")
    ) {
      return NextResponse.json({ error: "Insufficient permissions" }, {
        status: 403,
      });
    }

    const email = await req.json();

    // Get base URL - prioritize NEXT_PUBLIC_URL, then VERCEL_URL, then localhost
    let baseUrl = process.env.NEXT_PUBLIC_URL;
    if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }
    if (!baseUrl) {
      baseUrl = "http://localhost:3000";
    }

    // Send password reset email using Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/update-password`,
    });

    if (error) {
      return NextResponse.json({
        error: `Failed to send password reset email: ${error.message}`,
        status: 500,
      });
    }

    return NextResponse.json({
      reset: "password change successfully!",
      status: 200,
    });
  } catch (error) {
    console.error("Error in password change:", error);
    return NextResponse.json({
      error: `Failed to send password reset email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      status: 500,
    });
  }
}
