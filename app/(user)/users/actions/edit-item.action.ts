"use server";

import { User } from "@prisma/client";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/users/editInfo";
import { getSession } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../../core/auth/auth0-management-api";

export async function editItem(formData: User, authId: string) {
  const result = validation.safeParse(formData);
  const session = await getSession();

  //Managing token
  await Auth0ManagementApi.manageToken(session);

  let userId = null;
  if (session) {
    userId = session.user.sub;

    console.log("data", formData, authId);
    if (result.success) {
      try {
        const resultUpdate = await prisma.user.update({
          where: {
            authId,
          },
          data: {
            email: result.data.email,
            family_name: result.data.family_name,
            given_name: result.data.given_name,
            roles: {
              connect: result.data.incarichi.map((incaricoId) => ({
                id: Number(incaricoId),
              })),
            },
          },
        });

        // Add the new role(s) to the user
        const updateRoleAuth0 = await fetch(
          `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}/roles`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.managementToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roles: [result.data.role],
            }),
          }
        );

        // Create a new Action record to track the user action
        const action = await prisma.action.create({
          data: {
            type: "user_update",
            data: {
              userId: resultUpdate.id,
            },
            User: {
              connect: {
                authId: userId,
              },
            },
          },
        });
        // return revalidatePath("/suppliers");
        return resultUpdate;
      } catch (error: any) {
        console.error("Error updating supplier:", error);
        // Make sure to return a plain object
        return { message: "Creazione elemento fallita!", error: error.message };
      }
    } else {
      return { message: "Validazione elemento fallita!" };
    }
  }
}
