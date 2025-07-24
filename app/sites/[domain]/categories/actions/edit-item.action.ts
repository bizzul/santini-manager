"use server";

import { Product_category } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/productsCategory/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function editItem(
  formData: Pick<Product_category, "name" | "description">,
  id: number
) {
  const data = validation.safeParse(formData);

  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (!data.success) {
    console.log("Validation failed");
    return { error: "Validazione elemento fallita!" };
  }

  try {
    const result = await prisma.product_category.update({
      where: {
        id,
      },
      data: {
        name: data.data.name,
        description: data.data.description,
      },
    });

    // Create a new Action record to track the user action
    await prisma.action.create({
      data: {
        type: "product_category_update",
        data: {
          product_category: result.id,
        },
        User: {
          connect: {
            authId: userId,
          },
        },
      },
    });

    revalidatePath("/categories");
    console.log("Path revalidated, returning success");
    return { success: true };
  } catch (e) {
    console.error("Error updating category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
