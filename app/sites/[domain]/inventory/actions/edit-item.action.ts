"use server";

import { Product, SellProduct } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/products/create";
import { getSession } from "@auth0/nextjs-auth0";
export async function editItem(formData: Product, id: number) {
  const result = validation.safeParse(formData);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (result.success) {
    try {
      const totalPrice = formData.unit_price * formData.quantity;

      const result = await prisma.product.update({
        where: {
          id,
        },
        data: {
          //@ts-ignore
          product_category: { connect: { id: formData.productCategoryId } },
          name: formData.name,
          supplierInfo: { connect: { id: formData.supplierId! } },
          unit_price: formData.unit_price,
          description: formData.description,
          height: formData.height,
          length: formData.length,
          width: formData.width,
          quantity: formData.quantity,
          total_price: totalPrice,
          type: formData.type,
          unit: formData.unit,
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "product_update",
          data: {
            inventoryId: result.inventoryId,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
          Product: {
            connect: {
              id: result.id,
            },
          },
        },
      });

      return revalidatePath("/inventory");
    } catch (e) {
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
