"use server";

import { Product_category } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/productsCategory/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function createItem(
  props: Pick<Product_category, "name" | "description">
) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (result.success) {
    try {
      const result = await prisma.product_category.create({
        data: {
          name: props.name,
          description: props.description,
        },
      });

      if (result) {
        // Create a new Action record to track the user action
        const action = await prisma.action.create({
          data: {
            type: "product_category_create",
            data: {
              category_id: result.id,
            },
            User: {
              connect: {
                authId: userId,
              },
            },
          },
        });

        return revalidatePath("/categories");
      }
    } catch (error: any) {
      console.error("Error creating categories:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
