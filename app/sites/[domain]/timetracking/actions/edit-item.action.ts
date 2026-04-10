"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/timeTracking/editManual";
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
      if (!session?.user?.id) {
        return { message: "Utente non autenticato" };
      }

      const supabase = await createClient();
      const isAdminOrSuperadmin =
        session?.role === "admin" || session?.role === "superadmin";
      const { data: currentUserRecord, error: currentUserError } = await supabase
        .from("User")
        .select("id")
        .eq("authId", session.user.id)
        .maybeSingle();

      if (currentUserError) {
        console.error("Error fetching current user for edit:", currentUserError);
        return { message: "Utente non autorizzato" };
      }

      const currentEmployeeId = currentUserRecord?.id ?? null;
      const { data: existingEntry, error: existingEntryError } = await supabase
        .from("Timetracking")
        .select("id, employee_id")
        .eq("id", id)
        .maybeSingle();

      if (existingEntryError) {
        console.error("Error fetching timetracking entry for edit:", existingEntryError);
        return { message: "Impossibile verificare il consuntivo da modificare" };
      }

      if (!existingEntry) {
        return { message: "Consuntivo non trovato" };
      }

      if (!isAdminOrSuperadmin && existingEntry.employee_id !== currentEmployeeId) {
        return { message: "Non puoi modificare le ore di un altro collaboratore" };
      }

      if (
        !isAdminOrSuperadmin &&
        result.data.userId != null &&
        Number(result.data.userId) !== currentEmployeeId
      ) {
        return { message: "Non puoi riassegnare il consuntivo a un altro collaboratore" };
      }

      const totalTimeInHours = result.data.hours + result.data.minutes / 60;
      const roundedTotalTime = parseFloat(totalTimeInHours.toFixed(2));

      // Check if the user used the CNC
      const roleId = Array.isArray(result.data.roles)
        ? result.data.roles[0]
        : result.data.roles;
      const useCNC = roleId === "2" || roleId === 2;

      const updateData: Record<string, unknown> = {
        description: result.data.description,
        hours: result.data.hours,
        minutes: result.data.minutes,
        totalTime: roundedTotalTime,
        use_cnc: useCNC,
        site_id: siteId,
      };

      if (result.data.date || result.data.created_at) {
        updateData.created_at = new Date(
          result.data.date || result.data.created_at!
        );
      }
      if (result.data.task != null) {
        updateData.task_id = Number(result.data.task);
      }
      if (result.data.userId != null) {
        updateData.employee_id = Number(result.data.userId);
      }
      if (result.data.lunchOffsite != null) {
        updateData.lunch_offsite = result.data.lunchOffsite;
      }
      if (result.data.lunchLocation != null) {
        updateData.lunch_location = result.data.lunchLocation || null;
      }

      const { data: timetracking, error: timetrackingError } = await supabase
        .from("Timetracking")
        .update(updateData)
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
      if (roleId != null) {
        // First, delete existing role relationships for this timetracking entry
        await supabase
          .from("_RolesToTimetracking")
          .delete()
          .eq("B", id); // B is the timetracking id

        // Then, create the new role relationship
        const { error: roleError } = await supabase
          .from("_RolesToTimetracking")
          .insert({
            A: Number(roleId),
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
