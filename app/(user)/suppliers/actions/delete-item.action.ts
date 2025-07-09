"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Product } from "@prisma/client";

export const removeItem = async (formData: Product) => {
  try {
    await prisma.supplier.delete({
      where: { id: Number(formData.id) },
    });
    return revalidatePath("/suppliers");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
