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
          client: { connect: { id: result.data.clientId! } },
          deliveryDate: result.data.deliveryDate,
          unique_code: result.data.unique_code,
          sellProduct: { connect: { id: result.data.productId! } },
          kanban: { connect: { identifier: "PRODUCTION" } }, // in which KanBan is created
          column: { connect: { identifier: "TODOPROD" } }, // in which Column is created
          sellPrice: result.data.sellPrice,
          other: result.data.other,
          positions: {
            set: positions,
          },
        },
      });

      const defaultSuppliers = await prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: "GRE", mode: "insensitive" } },
            { name: { contains: "Gutmann", mode: "insensitive" } },
            { name: { contains: "Meas", mode: "insensitive" } },
          ],
        },
      });

      // Crea le relazioni TaskSupplier per ogni fornitore trovato
      if (defaultSuppliers.length > 0) {
        await prisma.taskSupplier.createMany({
          data: defaultSuppliers.map((supplier) => ({
            taskId: taskCreate.id,
            supplierId: supplier.id,
            deliveryDate: null,
          })),
        });
      }

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

      return revalidatePath("/kanban?name=PRODUCTION");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
