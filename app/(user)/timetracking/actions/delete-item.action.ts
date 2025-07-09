"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Product, Timetracking } from "@prisma/client";

export const removeItem = async (formData: Timetracking) => {
  try {
    await prisma.timetracking.delete({
      where: { id: Number(formData.id) },
    });
    return revalidatePath("/timetrackings");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
