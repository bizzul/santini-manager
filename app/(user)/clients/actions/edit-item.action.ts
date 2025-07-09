"use server";

import { Client } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/clients/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function editItem(props: Client, id: number) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (result.success) {
    try {
      const firstInitials = result.data?.individualFirstName
        ? result.data?.individualFirstName.slice(0, 2)
        : undefined;
      const lastInitials = result.data?.individualLastName
        ? result.data?.individualLastName.slice(0, 2)
        : undefined;

      const generatedCode = firstInitials ? firstInitials + lastInitials : "";
      // Concatenate the initials using the + operator

      const saveData = await prisma.client.update({
        where: {
          id,
        },
        data: {
          individualTitle:
            result.data?.clientType === "INDIVIDUAL"
              ? result.data?.individualTitle
              : "",
          businessName:
            result.data?.clientType === "BUSINESS"
              ? result.data?.businessName
              : "",
          individualFirstName: result.data?.individualFirstName,
          //@ts-ignore
          clientType: result.data.clientType,
          individualLastName: result.data?.individualLastName,
          address: result.data?.address,
          city: result.data?.city,
          countryCode: result.data?.countryCode,
          email: result.data?.email,
          phone: result.data?.phone,
          zipCode: result.data?.zipCode !== 0 ? result.data?.zipCode : null,
          clientLanguage: result.data?.clientLanguage,
          code: generatedCode,
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "client_update",
          data: {
            clientId: saveData.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
        },
      });

      console.log(action);

      return revalidatePath("/clients");
    } catch (error: any) {
      console.error("Error creating product:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
