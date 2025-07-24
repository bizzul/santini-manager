"use server";

import {
  Product,
  Product_category,
  Roles,
  Supplier,
  Timetracking,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";
import { validation } from "../../../../validation/timeTracking/createManual";
import { getSession } from "@auth0/nextjs-auth0";

export async function createItem(props: Timetracking) {
  const result = validation.safeParse(props);
  const session = await getSession();
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  if (result.success) {
    try {
      const totalTimeInHours = result.data.hours + result.data.minutes / 60;
      //const roundedTotalTime = Math.round(totalTimeInHours * 2) / 2; // round to nearest half hour
      const roundedTotalTime = parseFloat(totalTimeInHours.toFixed(2));
      // Check if the user used the CNC
      let useCNC = false;
      if (result.data.roles === "2") {
        useCNC = true;
      } else {
        useCNC = false;
      }

      const resultSave = await prisma.timetracking.create({
        data: {
          created_at: new Date(result.data.date),
          description: result.data.description,
          description_type: result.data.descriptionCat,
          // startTime: start.toISOString(), // Convert to UTC string
          // endTime: end.toISOString(), // Convert to UTC string
          // totalTime: total,
          hours: result.data.hours,
          minutes: result.data.minutes,
          totalTime: roundedTotalTime, // total time in hours rounded to half
          use_cnc: useCNC,
          roles: {
            connect: {
              id: Number(result.data.roles),
            },
          },
          task: { connect: { id: Number(result.data.task) } },
          user: { connect: { id: Number(result.data.userId) } },
        },
      });

      // Create a new Action record to track the user action
      const action = await prisma.action.create({
        data: {
          type: "timetracking_create",
          data: {
            timetrackingId: resultSave.id,
          },
          User: {
            connect: {
              authId: userId,
            },
          },
        },
      });

      // return revalidatePath("/suppliers");
      return resultSave;
    } catch (error: any) {
      console.error("Error creating timetracking:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
