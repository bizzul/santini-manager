"use server";

import { Timetracking } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/timeTracking/createManual";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(props: Timetracking, domain?: string) {
  console.log("=== CREATE ITEM ACTION START ===");
  console.log("Props received:", JSON.stringify(props, null, 2));
  console.log("Domain:", domain);

  const result = validation.safeParse(props);
  console.log("Validation result:", result.success ? "SUCCESS" : "FAILED");
  if (!result.success) {
    console.error(
      "Validation errors:",
      JSON.stringify(result.error.format(), null, 2),
    );
  }

  let siteId = null;

  // Get site_id from domain if provided
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  if (result.success) {
    try {
      const supabase = await createClient();
      const totalTimeInHours = result.data.hours + result.data.minutes / 60;
      const roundedTotalTime = parseFloat(totalTimeInHours.toFixed(2));

      // Check if the user used the CNC
      let useCNC = false;
      if (result.data.roles === "CNC") {
        useCNC = true;
      }

      // Determine activity type (default to 'project' for backwards compatibility)
      const activityType = result.data.activityType || "project";
      const isInternalActivity = activityType === "internal";

      // Build insert data
      const insertData: any = {
        created_at: new Date(result.data.date),
        description: result.data.description,
        description_type: result.data.descriptionCat,
        hours: result.data.hours,
        minutes: result.data.minutes,
        totalTime: roundedTotalTime,
        use_cnc: useCNC,
        employee_id: Number(result.data.userId),
        site_id: siteId,
        activity_type: activityType,
      };

      // Add task_id only for project activities
      if (!isInternalActivity && result.data.task) {
        insertData.task_id = Number(result.data.task);
      }

      // Add internal_activity for internal activities
      if (isInternalActivity && result.data.internalActivity) {
        insertData.internal_activity = result.data.internalActivity;
      }

      const { data: timetracking, error: timetrackingError } = await supabase
        .from("Timetracking")
        .insert(insertData)
        .select()
        .single();

      if (timetrackingError) {
        console.error("Error creating timetracking:", timetrackingError);
        return {
          message: "Creazione elemento fallita!",
          error: timetrackingError.message,
        };
      }

      // Create role relationship if role is provided
      if (result.data.roles) {
        const { error: roleError } = await supabase
          .from("_RolesToTimetracking")
          .insert({
            A: Number(result.data.roles),
            B: timetracking.id,
          });

        if (roleError) {
          console.error("Error creating role relationship:", roleError);
          // Continue anyway, as the timetracking entry was created successfully
        }
      }

      const resultSave = timetracking;

      // Create a new Action record to track the user action (non-blocking)
      if (timetracking) {
        try {
          const actionData: any = {
            type: "timetracking_create",
            data: {
              timetrackingId: resultSave.id,
            },
            user_id: Number(result.data.userId), // Use the employee_id (internal user id)
          };

          // Add site_id if available
          if (siteId) {
            actionData.site_id = siteId;
          }

          const { error: actionError } = await supabase
            .from("Action")
            .insert(actionData);

          if (actionError) {
            console.error(
              "Error creating action record (non-blocking):",
              actionError,
            );
          }
        } catch (actionErr) {
          console.error(
            "Error creating action record (non-blocking):",
            actionErr,
          );
        }
      }

      revalidatePath(`/sites/${domain}/timetracking`);
      return resultSave;
    } catch (error: any) {
      console.error("Error creating timetracking:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
