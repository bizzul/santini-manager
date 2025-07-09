"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { PackingControl, QualityControl, SellProduct } from "@prisma/client";

async function removeProduct(id: number): Promise<PackingControl> {
  const product = await prisma.packingControl.delete({
    where: { id },
  });
  return product;
}

export const removeItem = async (formData: FormData) => {
  //   console.log("formData", formData);
  try {
    await removeProduct(Number(formData));
    return revalidatePath("/boxing");
  } catch (e) {
    return { message: "Failed to delete" };
  }
};
