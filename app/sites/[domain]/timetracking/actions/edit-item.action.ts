"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/timeTracking/createManual";
import { getUserContext } from "@/lib/auth-utils";

export async function editItem(props: any, id: number) {
  const result = validation.safeParse(props);
  const session = await getUserContext();
  let userId = null;
  if (session && session.user && session.user.id) {
    // Get the integer user ID from the User table using the authId
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("authId", session.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      return { error: true, message: "Errore nel recupero dei dati utente!" };
    }

    userId = userData?.id;
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
        .from("timetracking")
        .update({
          created_at: new Date(result.data.date),
          description: result.data.description,
          description_type: result.data.descriptionCat,
          hours: result.data.hours,
          minutes: result.data.minutes,
          totalTime: roundedTotalTime,
          use_cnc: useCNC,
          roles: Number(result.data.roles),
          task_id: Number(result.data.task),
          employee_id: Number(result.data.userId),
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

      // Create a new Action record to track the user action
      if (timetracking && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "timetracking_update",
            data: {
              timetrackingId: timetracking.id,
            },
            userId: userId,
          });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      return timetracking;
    } catch (error: any) {
      console.error("Error updating timetracking:", error);
      // Make sure to return a plain object
      return { message: "Modifica elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
