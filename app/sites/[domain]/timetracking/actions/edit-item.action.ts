"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/timeTracking/createManual";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function editItem(props: any, id: number, domain?: string) {
  const result = validation.safeParse(props);
  const session = await getUserContext();
  let userId = null;
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

  if (session && session.user && session.user.id) {
    // Use the authId directly for the Action table (it expects UUID, not integer)
    userId = session.user.id;
  }

  if (result.success) {
    try {
      const supabase = await createClient();
      const totalTimeInHours = result.data.hours + result.data.minutes / 60;
      const roundedTotalTime = parseFloat(totalTimeInHours.toFixed(2));

      // Check if the user used the CNC
      let useCNC = false;
      if (result.data.roles === "2") {
        useCNC = true;
      } else {
        useCNC = false;
      }

      const { data: timetracking, error: timetrackingError } = await supabase
        .from("Timetracking")
        .update({
          created_at: new Date(result.data.date),
          description: result.data.description,
          description_type: result.data.descriptionCat,
          hours: result.data.hours,
          minutes: result.data.minutes,
          totalTime: roundedTotalTime,
          use_cnc: useCNC,
          task_id: Number(result.data.task),
          employee_id: Number(result.data.userId),
          site_id: siteId,
        })
        .eq("id", id)
        .select()
        .single();

      if (timetrackingError) {
        console.error("Error updating timetracking:", timetrackingError);
        return {
          message: "Modifica elemento fallita!",
          error: timetrackingError.message,
        };
      }

      // Update role relationship if role is provided
      if (result.data.roles) {
        // First, delete existing role relationships for this timetracking entry
        await supabase
          .from("_RolesToTimetracking")
          .delete()
          .eq("B", id); // B is the timetracking id

        // Then, create the new role relationship
        const { error: roleError } = await supabase
          .from("_RolesToTimetracking")
          .insert({
            A: Number(result.data.roles),
            B: id,
          });

        if (roleError) {
          console.error("Error updating role relationship:", roleError);
          // Continue anyway, as the timetracking entry was updated successfully
        }
      }

      // Create a new Action record to track the user action
      if (timetracking && userId) {
        const actionData: any = {
          type: "timetracking_update",
          data: {
            timetrackingId: timetracking.id,
          },
          user_id: userId,
        };

        // Add site_id if available
        if (siteId) {
          actionData.site_id = siteId;
        }

        const { error: actionError } = await supabase
          .from("Action")
          .insert(actionData);

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      revalidatePath(`/sites/${domain}/timetracking`);
      return timetracking;
    } catch (error: any) {
      console.error("Error updating timetracking:", error);
      // Make sure to return a plain object
      return { message: "Modifica elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!", error: result.error };
  }
}
