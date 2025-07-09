"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { getSession } from "@auth0/nextjs-auth0";

export async function archiveItem(archived: boolean, id: number) {
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  try {
    const archiveTask = await prisma.task.update({
      where: {
        id: Number(id),
      },
      data: {
        archived: archived,
      },
    });

    // Create a new Action record to track the user action
    await prisma.action.create({
      data: {
        type: "task_update",
        data: {
          task: archiveTask.id,
        },
        User: {
          connect: {
            authId: userId,
          },
        },
      },
    });

    return revalidatePath("/kanban");
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
