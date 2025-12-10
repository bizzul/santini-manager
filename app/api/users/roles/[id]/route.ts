// pages/api/protected-route.js
import { createClient } from "../../../../../utils/supabase/server";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    // console.log(userId);

    // Get user roles from Supabase
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select(`
        *,
        roles:role_id(*)
      `)
      .eq("user_id", userId);

    if (rolesError) throw rolesError;

    return NextResponse.json({ rolesData, status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error, status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const roleId = await req.json();

    // Get user's current roles
    const { data: currentRoles, error: getRolesError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);

    if (getRolesError) throw getRolesError;

    // If the user already has roles, delete them all
    if (currentRoles && currentRoles.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        throw new Error(
          `Failed to delete user's current roles: ${deleteError.message}`,
        );
      }
    }

    // Add the new role(s) to the user
    const { error: addError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id: roleId,
      });

    if (addError) {
      throw new Error(`Failed to add new role(s) to user: ${addError.message}`);
    }

    return NextResponse.json({
      updated: `Successfully updated user's roles: ${roleId}`,
      status: 200,
    });
  } catch (error) {
    logger.error(error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}
