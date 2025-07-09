"use server";

import {
  Product,
  Product_category,
  Roles,
  Supplier,
  User,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/employeeRoles/create";
import { getSession } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../../core/auth/auth0-management-api";

export async function createItem(props: Roles) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  if (result.success && session) {
    try {
      const resultData = await prisma.roles.create({
        data: {
          name: result.data.name,
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "role_create",
          data: {
            roleId: resultData.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
        },
      });

      // return revalidatePath("/suppliers");
      // // Success - Return created user and assigned role
      if (result) {
        return { prisma: result };
      }
    } catch (error: any) {
      console.error("Error creating role:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  }
}
