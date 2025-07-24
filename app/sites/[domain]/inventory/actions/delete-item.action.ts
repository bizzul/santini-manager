"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Product } from "@prisma/client";

export const removeItem = async (formData: Product) => {
  try {
    const product = await prisma.product.delete({
      where: { id: Number(formData.id) },
    });
    return revalidatePath("/inventory");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
