"use server";

import { SellProduct } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/sellProducts/create";

export async function createSellProduct(props: SellProduct) {
  const result = validation.safeParse(props);

  if (result.success) {
    const sellProduct = await prisma.sellProduct.create({
      data: {
        name: props.name,
        type: props.type,
      },
    });
    return { success: true, data: sellProduct };
  } else if (!result.success) {
    return { success: false, error: result.error.format() };
  }
}

export async function createSellProductAction(props: SellProduct) {
  //console.log("props", props);
  try {
    const response = await createSellProduct(props);
    if (response!.success === true) {
      return revalidatePath("/products");
    }
  } catch (e) {
    return { message: "Creazione elemento fallita!", error: e };
  }
}
