"use server";

import { Product, Product_category, Supplier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/supplier/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function createItem(props: Supplier) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  console.log("userId", userId);
  if (result.success) {
    try {
      const resultSave = await prisma.supplier.create({
        data: {
          description: result.data.description,
          name: result.data.name,
          address: result.data.address,
          cap: result.data.cap,
          category: result.data.category,
          contact: result.data.contact,
          email: result.data.email,
          location: result.data.location,
          phone: result.data.phone,
          short_name: result.data.short_name,
          website: result.data.website,
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "supplier_create",
          data: {
            supplierId: resultSave.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
          supplierId: resultSave.id,
        },
      });

      // return revalidatePath("/suppliers");
      return resultSave;
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
