"use server";

import { Errortracking, Task } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/task/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function editItem(formData: Task, id: number) {
  const result = validation.safeParse(formData);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  // console.log("result", result.error);
  try {
    if (result.success) {
      // Get the first column of the selected kanban if kanban is being changed
      let firstColumn;
      if (result.data.kanbanId) {
        firstColumn = await prisma.kanbanColumn.findFirst({
          where: {
            kanbanId: result.data.kanbanId,
            position: 1,
          },
        });
      }

      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || ""
      );
      console.log("positions", positions);

      const taskCreate = await prisma.task.update({
        where: {
          id: Number(id),
        },
        data: {
          unique_code: result.data?.unique_code || undefined,
          name: result.data?.name || undefined,
          deliveryDate: result.data.deliveryDate || undefined || "",
          other: result.data?.other || undefined || "",
          sellPrice: result.data?.sellPrice
            ? Number(result.data?.sellPrice)
            : undefined,
          clientId: result.data?.clientId
            ? Number(result.data?.clientId)
            : undefined,
          sellProductId: result.data?.productId
            ? Number(result.data?.productId)
            : undefined,
          kanbanId: result.data?.kanbanId
            ? Number(result.data?.kanbanId)
            : undefined,
          kanbanColumnId: firstColumn ? firstColumn.id : undefined, // Only update column if kanban was changed
          positions: {
            set: positions || undefined,
          },
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "task_update",
          data: {
            task: taskCreate.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
        },
      });

      return revalidatePath("/projects");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
