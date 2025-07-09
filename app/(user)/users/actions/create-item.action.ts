"use server";

import { Product, Product_category, Supplier, User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/users/create";
import { getSession } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../../core/auth/auth0-management-api";

export async function createItem(props: User) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (result.success && session) {
    try {
      //Managing token
      await Auth0ManagementApi.manageToken(session);

      const user = {
        email: result.data?.email,
        password: result.data?.password,
        given_name: result.data?.given_name,
        family_name: result.data?.family_name,
        connection: "Username-Password-Authentication",
        // user_metadata: {
        //   color: result.data?.color,
        //   sigla: result.data?.initials,
        // },
      };

      const roleId = result.data?.role;

      // Create user
      const createUserResponse = await fetch(
        `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users`,
        {
          method: "POST",
          headers: new Headers({
            Authorization: `Bearer ${session.managementToken}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(user),
        }
      );

      const createdUser = await createUserResponse.json();

      // Assign role to user
      const assignRoleResponse = await fetch(
        `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${createdUser.user_id}/roles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.managementToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roles: [roleId] }),
        }
      );

      const resultData = await prisma.user.create({
        data: {
          roles: {
            connect:
              //@ts-ignore
              result.data?.incarichi?.map((c: any) => ({ id: Number(c) })) ||
              [],
          },
          email: createdUser.email,
          authId: createdUser.user_id,
          given_name: createdUser.given_name,
          family_name: createdUser.family_name,
          //initials: createdUser.user_metadata.sigla,
          picture: createdUser.picture,
        },
      });

      console.log("resultData", resultData);

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "user_create",
          data: {
            userId: resultData.id,
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
        return { auth0: createdUser, prisma: result };
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  }
}
