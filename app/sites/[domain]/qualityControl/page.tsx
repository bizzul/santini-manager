import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import GridReports from "@/components/reports/GridReports";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSellProducts(): Promise<any[]> {
  // Fetch data from your API here.
  // Fetch all the products
  const supabase = await createClient();

  // First, get all quality controls with their related data
  const { data: qualityControl, error: qualityControlError } =
    await supabase.from("quality_control").select(`
      *,
      task:taskId(*),
      user:userId(*)
    `);

  if (qualityControlError) {
    console.error("Error fetching quality control:", qualityControlError);
    return [];
  }

  // Get tasks with their columns to filter out archived tasks and SPEDITO tasks
  const { data: tasks, error: tasksError } = await supabase
    .from("task")
    .select(
      `
      *,
      column:kanbanColumnId(*)
    `
    )
    .eq("archived", false);

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    return [];
  }

  // Filter tasks that are not in SPEDITO column
  const validTaskIds =
    tasks
      ?.filter((task) => task.column?.identifier !== "SPEDITO")
      ?.map((task) => task.id) || [];

  // Filter quality controls to only include those with valid tasks
  const filteredQualityControl =
    qualityControl?.filter((qc) => validTaskIds.includes(qc.taskId)) || [];

  console.log(filteredQualityControl);

  // Grouping by taskId and transforming into an array of objects
  const groupedByTaskId = filteredQualityControl.reduce((group: any, qc) => {
    const taskId = qc.taskId;
    const existingGroup: any = group.find((g: any) => g.taskId === taskId);

    if (existingGroup) {
      existingGroup.qualityControls.push(qc);
      existingGroup.passed = updatePassedStatus(
        existingGroup.passed,
        qc.passed
      );
    } else {
      group.push({
        taskId: taskId,
        taskDetails: qc.task, // Assuming you want to keep task details
        userDetails: qc.user,
        qualityControls: [qc],
        passed: qc.passed, // Initial status based on the first item
      });
    }

    return group;
  }, []);

  function updatePassedStatus(currentStatus: string, newItemStatus: string) {
    console.log("current", currentStatus, "new", newItemStatus);
    if (currentStatus === "DONE" || newItemStatus === "DONE") {
      return "DONE";
    } else if (
      currentStatus === "PARTIALLY_DONE" &&
      newItemStatus === "PARTIALLY_DONE"
    ) {
      return "DONE";
    } else if (newItemStatus === "PARTIALLY_DONE") {
      return "DONE";
    } else {
      return "NOT_DONE";
    }
  }

  return groupedByTaskId;
}

async function Page() {
  //get initial data
  const data = await getSellProducts();
  const session = await getUserContext();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = session;

  return (
    // <SWRProvider>
    <div className="container">
      {/* <DialogCreate /> */}
      {data ? (
        <GridReports data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun quality control creato!</h1>
        </div>
      )}
    </div>
  );
}

export default Page;
