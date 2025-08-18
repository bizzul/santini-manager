import { validation } from "../../../../validation/timeTracking/create";
import { createClient } from "../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Helper function to calculate total hours
function calculateTotalHours(hours: number, minutes: number): number {
  const totalTimeInHours = hours + minutes / 60;
  return parseFloat(totalTimeInHours.toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse and validate request data
    const data = await req.json().catch(() => {
      throw new Error("Invalid JSON payload");
    });

    const dataArray = validation.safeParse(data);
    if (!dataArray.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: dataArray.error.format(),
          status: 400,
        },
        { status: 400 },
      );
    }

    const timetrackings = dataArray.data;
    const results: { timetracking: any; action: any }[] = [];

    // Process each time tracking entry
    for (const data of timetrackings) {
      const roundedTotalTime = calculateTotalHours(data.hours, data.minutes);
      const useCNC = data.roles.id === 2;

      // Get task ID from unique code
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("id")
        .eq("unique_code", data.task)
        .single();

      if (taskError) throw taskError;

      // Create timetracking entry
      const { data: timetracking, error: timetrackingError } = await supabase
        .from("timetracking")
        .insert({
          description: data.description,
          description_type: data.descriptionCat,
          hours: data.hours,
          minutes: data.minutes,
          total_time: roundedTotalTime,
          use_cnc: useCNC,
          role_id: data.roles.id,
          task_id: task.id,
          user_id: data.userId,
        })
        .select()
        .single();

      if (timetrackingError) throw timetrackingError;

      // Create action record
      const { data: action, error: actionError } = await supabase
        .from("actions")
        .insert({
          type: "timetracking_create",
          data: {
            timetracking: timetracking.id,
          },
          user_id: data.userId,
        })
        .select()
        .single();

      if (actionError) throw actionError;

      results.push({ timetracking, action });
    }

    return NextResponse.json(
      {
        message: "Data successfully saved",
        results,
        status: 200,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in time-tracking creation:", error);

    // Handle specific database errors
    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as any;
      switch (dbError.code) {
        case "23505": // Unique constraint violation
          return NextResponse.json(
            {
              error: "Unique constraint violation",
              details: dbError.message,
              status: 409,
            },
            { status: 409 },
          );
        case "23503": // Foreign key violation
          return NextResponse.json(
            {
              error: "Record not found",
              details: dbError.message,
              status: 404,
            },
            { status: 404 },
          );
        default:
          return NextResponse.json(
            {
              error: "Database error",
              details: dbError.message,
              status: 500,
            },
            { status: 500 },
          );
      }
    }

    // Handle other types of errors
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
