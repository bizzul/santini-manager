import { createClient } from "../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id: userId } = await params;
    logger.debug("userId", userId);

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", status: 401 });
    }

    // Block the user in Supabase auth
    const { error: blockError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { blocked: true } },
    );

    if (blockError) {
      // If admin API fails, try to update the user record directly
      const { error: updateError } = await supabase
        .from("users")
        .update({ enabled: false })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Update local user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ enabled: false })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }
    }

    return NextResponse.json({ blocked: true, status: 200 });
  } catch (error) {
    console.error("Error blocking user:", error);
    return NextResponse.json({
      error: `Failed to block user: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      status: 500,
    });
  }
}
