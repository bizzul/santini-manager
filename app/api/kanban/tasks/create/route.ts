// pages/api/protected-route.js
import { getSession } from "@auth0/nextjs-auth0";
import { validation } from "../../../../../validation/task/create"; //? <--- The validation schema
import { prisma } from "../../../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = validation.safeParse(body); //? <---Veryfing body against validation schema
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  if (result.success) {
    // create an array of positions from the request body
    // if a position is not provided, it defaults to an empty string
    const positions = Array.from(
      { length: 8 },
      //@ts-ignore
      (_, i) => result.data[`position${i + 1}`] || ""
    );

    const taskCreate = await prisma.task.create({
      //@ts-ignore
      data: {
        title: "",
        clientId: result.data.clientId,
        deliveryDate: result.data.deliveryDate,
        unique_code: result.data.unique_code,
        sellProductId: result.data.productId,
        name: result.data.name,
        //@ts-ignore
        kanban: { connect: { identifier: "PRODUCTION" } },
        //@ts-ignore
        column: { connect: { identifier: "TODOPROD" } },
        sellPrice: result.data.sellPrice,
        other: result.data.other,
        positions: {
          set: positions,
        },
      },
    });
    // // Success
    if (taskCreate) {
      if (body.fileIds !== null) {
        // Save the Cloudinary IDs of the uploaded files to the task record
        await Promise.all(
          body.fileIds.map((fileId: number) => {
            return prisma.file.update({
              where: { id: fileId },
              data: {
                taskId: taskCreate.id,
              },
            });
          })
        );
      }
      // Create a new Action record to track the user action
      const newAction = await prisma.action.create({
        data: {
          type: "task_create",
          data: {
            task: taskCreate.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
          Task: {
            connect: {
              id: taskCreate.id,
            },
          },
        },
      });
      if (newAction) {
        return NextResponse.json({ taskCreate, status: 200 });
      }
    } else {
      NextResponse.json({ error: result, status: 500 });
    }
  } else {
    //Input invalid
    return NextResponse.json({ error: "Error", status: 500 });
  }
}
