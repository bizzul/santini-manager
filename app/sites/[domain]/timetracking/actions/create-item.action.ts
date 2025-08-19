"use server";

import {
  Product,
  Product_category,
  Roles,
  Supplier,
  Timetracking,
} from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/timeTracking/createManual";
import { getUserContext } from "@/lib/auth-utils";

export async function createItem(props: Timetracking) {
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
      //const roundedTotalTime = Math.round(totalTimeInHours * 2) / 2; // round to nearest half hour
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
        .insert({
          created_at: new Date(result.data.date),
          description: result.data.description,
          description_type: result.data.descriptionCat,
          // startTime: start.toISOString(), // Convert to UTC string
          // endTime: end.toISOString(), // Convert to UTC string
          // totalTime: total,
          hours: result.data.hours,
          minutes: result.data.minutes,
          totalTime: roundedTotalTime, // total time in hours rounded to half
          use_cnc: useCNC,
          roles: Number(result.data.roles),
          task_id: Number(result.data.task),
          employee_id: Number(result.data.userId),
        })
        .select()
        .single();

      if (timetrackingError) {
        console.error("Error creating timetracking:", timetrackingError);
        return {
          message: "Creazione elemento fallita!",
          error: timetrackingError.message,
        };
      }

      const resultSave = timetracking;

      // Create a new Action record to track the user action
      if (timetracking && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "timetracking_create",
            data: {
              timetrackingId: resultSave.id,
            },
            User: {
              connect: {
                authId: userId,
              },
            },
            userId: userId,
          });
      }

      // return revalidatePath("/suppliers");
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
