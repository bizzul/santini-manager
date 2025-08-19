import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import GridReports from "@/components/reports/GridReports";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Data {
  supplier: any[];
  qualityControl: any[];
  packingControl: any[];
  task: any[];
}
async function getData(): Promise<Data> {
  const supabase = await createClient();
  const { data: supplier, error: supplierError } = await supabase
    .from("supplier")
    .select("*");
  const { data: qualityControl, error: qualityControlError } = await supabase
    .from("quality_control")
    .select("*, task:task(*), items:items(*)");
  const { data: packingControl, error: packingControlError } = await supabase
    .from("packing_control")
    .select("*, task:task(*), items:items(*)");
  const { data: task, error: taskError } = await supabase
    .from("task")
    .select(
      "*, quality_control:quality_control(*), packing_control:packing_control(*)"
    );

  if (
    supplierError ||
    qualityControlError ||
    packingControlError ||
    taskError
  ) {
    console.error(
      "Error fetching data:",
      supplierError || qualityControlError || packingControlError || taskError
    );
    return { supplier: [], qualityControl: [], packingControl: [], task: [] };
  }

  return { supplier, qualityControl, packingControl, task };
}

async function Page() {
  const session = await getUserContext();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = session;

  const data = await getData();

  return (
    // <SWRProvider>
    <>
      <div className="p-4 h-screen">
        <h1 className="text-2xl font-bold  pb-12">
          Crea i documenti di reportistica
        </h1>
        <GridReports
          suppliers={data.supplier}
          qc={data.qualityControl}
          imb={data.packingControl}
          task={data.task}
        />
      </div>
    </>
  );

  //
}

export default Page;
