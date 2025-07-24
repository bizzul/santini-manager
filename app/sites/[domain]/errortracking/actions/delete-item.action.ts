"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Errortracking, Product } from "@prisma/client";

export const removeItem = async (formData: Errortracking) => {
  try {
    const data = await prisma.errortracking.delete({
      where: { id: Number(formData.id) },
    });
    return revalidatePath("/errortracking");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
