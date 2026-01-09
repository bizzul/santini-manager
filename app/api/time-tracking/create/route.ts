import { validation } from "../../../../validation/timeTracking/create";
import { createClient } from "../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";

// Helper function to calculate total hours
function calculateTotalHours(hours: number, minutes: number): number {
  const totalTimeInHours = hours + minutes / 60;
  return parseFloat(totalTimeInHours.toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Extract site_id from headers or domain
    let siteId = null;
    const siteIdHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

    if (siteIdHeader) {
      siteId = siteIdHeader;
    } else if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

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
      // Handle both string and object formats for roles
      const roleId = typeof data.roles === "string"
        ? data.roles
        : data.roles?.id?.toString();
      const useCNC = roleId ? parseInt(roleId) === 2 : false;

      // Determine activity type (default to 'project' for backwards compatibility)
      const activityType = data.activityType || "project";
      const isInternalActivity = activityType === "internal";

      let taskId: number | null = null;

      // Only fetch task if it's a project-based activity
      if (!isInternalActivity && data.task) {
        let taskQuery = supabase
          .from("Task")
          .select("id")
          .eq("unique_code", data.task);

        if (siteId) {
          taskQuery = taskQuery.eq("site_id", siteId);
        }

        const { data: task, error: taskError } = await taskQuery.single();

        if (taskError) throw taskError;
        taskId = task.id;
      }

      // Create timetracking entry
      const insertData: any = {
        description: data.description,
        description_type: data.descriptionCat,
        hours: data.hours,
        minutes: data.minutes,
        totalTime: roundedTotalTime,
        use_cnc: useCNC,
        employee_id: parseInt(data.userId),
        activity_type: activityType,
      };

      // Add task_id only for project activities
      if (taskId) {
        insertData.task_id = taskId;
      }

      // Add internal_activity for internal activities
      if (isInternalActivity && data.internalActivity) {
        insertData.internal_activity = data.internalActivity;
      }

      const { data: timetracking, error: timetrackingError } = await supabase
        .from("Timetracking")
        .insert(insertData)
        .select()
        .single();

      if (timetrackingError) throw timetrackingError;

      // Create role relationship if role is provided
      if (roleId) {
        const { error: roleError } = await supabase
          .from("_RolesToTimetracking")
          .insert({
            A: parseInt(roleId),
            B: timetracking.id,
          });

        if (roleError) {
          console.error("Error creating role relationship:", roleError);
          // Continue anyway, as the timetracking entry was created successfully
        }
      }

      // Create action record
      const actionData: any = {
        type: "timetracking_create",
        data: {
          timetracking: timetracking.id,
        },
        user_id: data.userId,
      };

      // Add site_id if available
      if (siteId) {
        actionData.site_id = siteId;
      }

      const { data: action, error: actionError } = await supabase
        .from("Action")
        .insert(actionData)
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
