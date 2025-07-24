"use server";

import { Errortracking } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/errorTracking/create";
import { getSession } from "@auth0/nextjs-auth0";

export async function createItem(props: any) {
  const result = validation.safeParse(props.data);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  // console.log("result", result.error);
  try {
    if (result.success) {
      const createError = await prisma.errortracking.create({
        data: {
          position: result.data.position,
          supplier: { connect: { id: Number(result.data.supplier!) } },
          description: result.data.description ?? "",
          error_category: result.data.errorCategory,
          error_type: result.data.errorType!,
          task: { connect: { id: Number(result.data.task) } },
          user: { connect: { id: Number(result.data.user) } },
        },
      });
      if (props.filedIds.length > 0) {
        props.fileIds.forEach(async (file: any) => {
          const fileCreate = await prisma.file.create({
            data: {
              errortrackingId: createError.id,
              name: file.original_filename,
              url: file.secure_url,
              cloudinaryId: file.asset_id,
            },
          });
        });
      }

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "errorTracking_create",
          data: {
            errorTracking: createError.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
        },
      });

      return revalidatePath("/errortracking");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
