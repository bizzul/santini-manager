"use server";

import { Product, Product_category } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/products/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function createItem(props: Product) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (result.success) {
    try {
      const totalPrice = props.unit_price * props.quantity;
      const result = await prisma.product.create({
        data: {
          //@ts-ignore
          product_category: { connect: { id: props.productCategoryId } },
          name: props.name,
          supplierInfo: { connect: { id: props.supplierId! } },
          unit_price: props.unit_price,
          description: props.description ?? "",
          height: props.height,
          length: props.length,
          width: props.width,
          quantity: props.quantity,
          total_price: totalPrice,
          type: props.type,
          unit: props.unit,
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "product_create",
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
    } catch (error: any) {
      console.error("Error creating product:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
