import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { QC_Status, QualityControl } from "@prisma/client";
import { prisma } from "../../../prisma-global";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";

async function getSellProducts(): Promise<QualityControl[]> {
  // Fetch data from your API here.
  // Fetch all the products
  const qualityControl = await prisma.qualityControl.findMany({
    include: {
      items: true,
      task: { include: { column: true } },
      user: true,
    },
    where: {
      AND: [
        {
          task: {
            archived: false,
            column: {
              identifier: {
                not: "SPEDITO",
              },
            },
          },
        },
      ],
    },
  });

  console.log(qualityControl);

  // Grouping by taskId and transforming into an array of objects
  const groupedByTaskId = qualityControl.reduce((group: any, qc) => {
    const taskId = qc.task.id;
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

  function updatePassedStatus(
    currentStatus: QC_Status,
    newItemStatus: QC_Status
  ) {
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

  // return qualityControl;
}

async function Page() {
  //get initial data
  const data = await getSellProducts();
  const session = await getSession();

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
        <SellProductWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun quality control creato!</h1>
        </div>
      )}
    </div>
  );
}

export default Page;
