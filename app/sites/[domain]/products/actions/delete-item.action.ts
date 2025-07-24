"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { SellProduct } from "@prisma/client";

async function removeProduct(id: number): Promise<SellProduct> {
  const product = await prisma.sellProduct.delete({
    where: { id },
  });
  return product;
}

export const removeItem = async (formData: FormData) => {
  //   console.log("formData", formData);
  try {
    await removeProduct(Number(formData));
    return revalidatePath("/products");
  } catch (e) {
    return { message: "Failed to create" };
  }
};
