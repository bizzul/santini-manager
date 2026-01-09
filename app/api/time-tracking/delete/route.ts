import { createClient } from "../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No IDs provided", status: 400 },
        { status: 400 },
      );
    }

    // First, delete related role relationships
    const { error: rolesError } = await supabase
      .from("_RolesToTimetracking")
      .delete()
      .in("B", ids);

    if (rolesError) {
      console.error("Error deleting role relationships:", rolesError);
      // Continue anyway, timetracking deletion is more important
    }

    // Delete timetracking entries
    const { error: deleteError } = await supabase
      .from("Timetracking")
      .delete()
      .in("id", ids);

    if (deleteError) {
      console.error("Error deleting timetracking entries:", deleteError);
      return NextResponse.json(
        {
          error: "Failed to delete entries",
          details: deleteError.message,
          status: 500,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: `Successfully deleted ${ids.length} entries`,
        deletedIds: ids,
        status: 200,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in time-tracking deletion:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
      { status: 500 },
    );
  }
}
