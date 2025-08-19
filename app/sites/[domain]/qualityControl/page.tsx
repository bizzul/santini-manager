import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import GridReports from "@/components/reports/GridReports";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<{
  suppliers: any[];
  qualityControl: any[];
  tasks: any[];
}> {
  // Fetch data from your API here.
  const supabase = await createClient();

  // Get suppliers for the reports
  const { data: suppliers, error: suppliersError } = await supabase
    .from("supplier")
    .select("*");

  if (suppliersError) {
    console.error("Error fetching suppliers:", suppliersError);
    return { suppliers: [], qualityControl: [], tasks: [] };
  }

  // First, get all quality controls with their related data
  const { data: qualityControl, error: qualityControlError } =
    await supabase.from("quality_control").select(`
      *,
      task:taskId(*),
      user:userId(*)
    `);

  if (qualityControlError) {
    console.error("Error fetching quality control:", qualityControlError);
    return { suppliers: suppliers || [], qualityControl: [], tasks: [] };
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
    return {
      suppliers: suppliers || [],
      qualityControl: qualityControl || [],
      tasks: [],
    };
  }

  return {
    suppliers: suppliers || [],
    qualityControl: qualityControl || [],
    tasks: tasks || [],
  };
}

async function Page() {
  //get initial data
  const data = await getData();
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
      {data.qualityControl && data.qualityControl.length > 0 ? (
        <GridReports
          suppliers={data.suppliers}
          imb={[]} // Empty array for packing control since this is quality control page
          qc={data.qualityControl}
          task={data.tasks}
        />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun quality control creato!</h1>
        </div>
      )}
    </div>
  );
}

export default Page;
