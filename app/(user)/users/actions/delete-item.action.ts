"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { Product, User } from "@prisma/client";
import { getSession } from "@auth0/nextjs-auth0";

export const removeItem = async (formData: User) => {
  try {
    const session = await getSession();

    if (session) {
      const deleteUserResponse = await fetch(
        `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${formData.authId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.managementToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (deleteUserResponse.status === 204) {
        //Removing client
        await prisma.user.delete({
          where: {
            authId: formData.authId!,
          },
        });

        return revalidatePath("/suppliers");
      }
    }
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
