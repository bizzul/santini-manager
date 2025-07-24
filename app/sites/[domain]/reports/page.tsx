import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faSquarePollVertical } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import GridReports from "@/components/reports/GridReports";
import { PackingControl, QualityControl, Supplier, Task } from "@prisma/client";
import { prisma } from "../../../prisma-global";

interface Data {
  supplier: Supplier[];
  qualityControl: QualityControl[];
  packingControl: PackingControl[];
  task: Task[];
}
async function getData(): Promise<Data> {
  const supplier = await prisma.supplier.findMany();
  const qualityControl = await prisma.qualityControl.findMany({
    include: { task: true, items: true },
  });
  const packingControl = await prisma.packingControl.findMany({
    include: { task: true, items: true },
  });
  const task = await prisma.task.findMany({
    include: { QualityControl: true },
  });
  return { supplier, qualityControl, packingControl, task };
}

async function Page() {
  const session = await getSession();

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
      <div className="p-4 h-[100vh]">
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
