"use server";

import { Errortracking, Product, SellProduct } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/errorTracking/create";
import { getSession } from "@auth0/nextjs-auth0";
export async function editItem(
  formData: Errortracking,
  id: number,
  files: any
) {
  const result = validation.safeParse(formData);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }

  if (result.success) {
    try {
      const updateError = await prisma.errortracking.update({
        where: {
          id,
        },
        data: {
          position: result.data.position,
          supplier_id: Number(result.data.supplier),
          description: result.data.description,
          error_category: result.data.errorCategory,
          error_type: result.data.errorType,
          task_id: Number(result.data.task),
          employee_id: Number(result.data.user),
        },
      });

      files.forEach(async (file: any) => {
        const fileUpdate = await prisma.file.update({
          where: {
            id: file.id,
          },
          data: {
            name: file.original_filename,
            url: file.secure_url,
            cloudinaryId: file.asset_id,
          },
        });
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "errorTracking_update",
          data: {
            errorTrackingId: updateError.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
        },
      });

      return revalidatePath("/errortracking");
    } catch (e) {
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
