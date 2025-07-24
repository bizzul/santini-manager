"use server";

import { SellProduct } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/sellProducts/create";
export async function editSellProductAction(formData: SellProduct, id: number) {
  const result = validation.safeParse(formData);
  if (result.success) {
    try {
      await prisma.sellProduct.update({
        where: {
          id,
        },
        data: {
          name: formData.name,
          type: formData.type,
          active: formData.active,
        },
      });
      return revalidatePath("/products");
    } catch (e) {
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
