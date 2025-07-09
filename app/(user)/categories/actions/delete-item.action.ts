"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Product_category } from "@prisma/client";

export const removeItem = async (formData: Product_category) => {
  try {
    const product = await prisma.product_category.delete({
      where: { id: Number(formData.id) },
    });
    return revalidatePath("/categories");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
