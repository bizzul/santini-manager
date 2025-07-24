"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { QualityControl, SellProduct } from "@prisma/client";

async function removeProduct(id: number): Promise<QualityControl> {
  const qc = await prisma.qualityControl.delete({
    where: { id },
  });
  return qc;
}

export const removeItem = async (formData: FormData) => {
  //   console.log("formData", formData);
  try {
    await removeProduct(Number(formData));
    return revalidatePath("/qualityControl");
  } catch (e) {
    return { message: "Failed to create" };
  }
};
