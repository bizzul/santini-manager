"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function archiveItem(
  archived: boolean,
  id: number,
  domain?: string,
) {
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;
  let organizationId = null;

  if (userContext) {
    userId = userContext.user.id;
  }

  // Get site information
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
        organizationId = siteResult.data.organization_id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  try {
    const supabase = await createClient();

    // Update task with site_id filtering if available
    let updateQuery = supabase
      .from("Task")
      .update({
        archived: archived,
      })
      .eq("id", id);

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { data: archiveTask, error: archiveTaskError } = await updateQuery
      .select()
      .single();

    if (archiveTaskError) {
      console.error("Error archiving task:", archiveTaskError);
      throw new Error("Failed to archive task");
    }

    // Create a new Action record to track the user action
    const actionData: any = {
      type: "task_update",
      data: {
        task: archiveTask.id,
      },
      user_id: userId,
    };

    // Add site and organization info if available
    if (siteId) {
      actionData.site_id = siteId;
    }
    if (organizationId) {
      actionData.organization_id = organizationId;
    }

    await supabase.from("Action").insert(actionData);

    return revalidatePath("/kanban");
  } catch (error: any) {
    console.error("Error archiving task:", error);
    // Make sure to return a plain object
    return { message: "Archivazione elemento fallita!", error: error.message };
  }
}
