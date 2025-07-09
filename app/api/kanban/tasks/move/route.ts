import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma-global";
import { getSession } from "@auth0/nextjs-auth0";

export async function POST(req: NextRequest) {
  const session = await getSession();

  const body = await req.json();
  const { id, column, columnName } = body;
  let userId: string = "";
  if (session) {
    userId = session.user.sub;
  }
  const now = new Date();

  console.log("Move card request:", { id, column, columnName, userId });

  try {
    const task = await prisma.task.findUnique({
      where: { id: id },
      include: {
        column: true,
        PackingControl: true,
        QualityControl: true,
      },
    });

    if (!task) {
      console.error("Task not found:", id);
      return NextResponse.json({ error: "Task not found", status: 404 });
    }

    console.log("Found task:", {
      taskId: task.id,
      currentColumn: task.column?.identifier,
    });

    const prevColumn = task?.column?.identifier;

    // Get the target column's position
    const targetColumn = await prisma.kanbanColumn.findUnique({
      where: { id: column },
    });

    if (!targetColumn) {
      console.error("Target column not found:", column);
      return NextResponse.json({
        error: "Target column not found",
        status: 404,
      });
    }

    console.log("Found target column:", {
      columnId: targetColumn.id,
      columnName: targetColumn.identifier,
    });

    // Get the total number of columns in the kanban to calculate progress percentage
    const totalColumns = await prisma.kanbanColumn.count({
      where: {
        kanbanId: task?.kanbanId || undefined,
      },
    });

    // Calculate progress based on target column position
    // First column (position 1) should always be 0%
    // For other columns, we calculate progress based on their position relative to total columns
    let progress = 0;
    if (targetColumn?.position && targetColumn.position > 1) {
      // Subtract 1 from position and totalColumns to make the calculation start from 0
      // This ensures first column is 0% and last column is 100%
      progress = Math.round(
        ((targetColumn.position - 1) * 100) / (totalColumns - 1)
      );
    }

    // If materials have been added, add 10 and 15 to the new progress value
    if (task!.metalli) {
      progress += 10;
    }
    if (task!.ferramenta) {
      progress += 15;
    }

    // Cap progress at 100%
    progress = Math.min(progress, 100);

    let response;
    let qcControlResult;
    let packingControlResult;
    //create the packing control and qualityControl objects

    if (columnName === "QCPROD" && task) {
      const qcMasterItems = await prisma.qcMasterItem.findMany();

      if (task?.QualityControl.length === 0) {
        // Create QualityControl if it doesn't exist
        qcControlResult = await prisma.$transaction(async (prisma) => {
          const qcPromises = task.positions
            .filter((position) => position !== "") // Filter out empty positions
            .map(async (position) => {
              // Create Quality Control entry
              const qcControl = await prisma.qualityControl.create({
                data: {
                  task: { connect: { id: task.id } },
                  user: { connect: { authId: userId } },
                  position_nr: position,
                },
              });

              // For each standard QC item, create a QC item linked to the new QC entry
              const qcItemPromises = qcMasterItems.map((item) =>
                prisma.qc_item.create({
                  data: {
                    name: item.name,
                    qualityControlId: qcControl.id, // Link to the newly created QC entry
                  },
                })
              );

              // Return all QC Item creation promises for this particular QC entry
              return Promise.all(qcItemPromises);
            });

          // Execute all promises for QC entries and their items
          return Promise.all(qcPromises.flat());
        });

        // Handle the results
      }
    }

    if (columnName === "IMBALLAGGIO" && task) {
      const packingMasterItems = await prisma.packingMasterItem.findMany();

      if (task?.PackingControl.length === 0) {
        // Create PackingCOntrol if it doesn't exist
        packingControlResult = await prisma.$transaction(async (prisma) => {
          // Create Quality Control entry
          const packingControl = await prisma.packingControl.create({
            data: {
              task: { connect: { id: task.id } },
              user: { connect: { authId: userId } },
            },
          });

          // For each standard QC item, create a QC item linked to the new QC entry
          const packingItemPromises = packingMasterItems.map((item) =>
            prisma.packingItem.create({
              data: {
                name: item.name,
                packingControlId: packingControl.id, // Link to the newly created QC entry
              },
            })
          );

          // Execute all promises for QC entries and their items
          return Promise.all(packingItemPromises);
        });

        // Handle the results
      }
    }

    response = await prisma.task.update({
      where: { id },
      data: {
        kanbanColumnId: column,
        updated_at: now,
        percentStatus: progress,
      },
      include: {
        column: true,
      },
    });

    if (response) {
      // Create a new Action record to track the user action
      const newAction = await prisma.action.create({
        data: {
          type: "move_task",
          data: {
            taskId: id,
            fromColumn: prevColumn,
            toColumn: response.column?.title,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
          Task: {
            connect: {
              id: id,
            },
          },
        },
      });

      return NextResponse.json({
        data: response,
        history: newAction,
        qc: qcControlResult,
        pc: packingControlResult,
        status: 200,
      });
    }
  } catch (err) {
    console.error("Error in move card API:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
      status: 400,
    });
  }
}
