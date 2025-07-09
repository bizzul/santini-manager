"use server";

import { prisma } from "../../../../prisma-global";

export async function getKanbans() {
  try {
    const kanbans = await prisma.kanban.findMany({
      include: {
        columns: {
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });
    return kanbans;
  } catch (error) {
    console.error("Error fetching kanbans:", error);
    throw new Error("Failed to fetch kanbans");
  }
}
