"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/task/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function createItem(props: any) {
  const result = validation.safeParse(props.data);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  // console.log("result", result.error);
  try {
    if (result.success) {
      // Require a kanban selection
      if (!result.data.kanbanId) {
        return { error: true, message: "È necessario selezionare un kanban!" };
      }

      // Get the first column of the selected kanban
      const firstColumn = await prisma.kanbanColumn.findFirst({
        where: {
          kanbanId: result.data.kanbanId,
          position: 1,
        },
      });

      if (!firstColumn) {
        return {
          error: true,
          message: "Kanban non valido: nessuna colonna trovata!",
        };
      }

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
          name: result.data.name,
          client: { connect: { id: result.data.clientId! } },
          deliveryDate: result.data.deliveryDate,
          unique_code: result.data.unique_code,
          sellProduct: { connect: { id: result.data.productId! } },
          kanban: { connect: { id: result.data.kanbanId } },
          column: { connect: { id: firstColumn.id } },
          sellPrice: result.data.sellPrice,
          other: result.data.other,
          positions: {
            set: positions,
          },
        },
      });

      // Create a new Action record to track the user action
      await prisma.action.create({
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
