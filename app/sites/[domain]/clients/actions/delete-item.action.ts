"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Product } from "@prisma/client";

export const removeItem = async (formData: Product) => {
  try {
    const product = await prisma.client.delete({
      where: { id: Number(formData.id) },
    });
    return revalidatePath("/clients");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
