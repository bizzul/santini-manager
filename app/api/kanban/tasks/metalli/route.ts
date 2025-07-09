import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma-global";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { request } from "http";

export async function POST(req: NextRequest) {
  const session = await getSession();

  const body = await req.json();
  const { id, metalliStatus } = body;
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  try {
    const task = await prisma.task.findUnique({
      where: {
        id,
      },
    });
    if (task) {
      let response;
      if (metalliStatus === true && task.metalli === false) {
        console.log("adding metalli");
        // Adding 25% only if it hasn't been added before
        response = await prisma.task.update({
          where: { id },
          data: {
            metalli: metalliStatus,
            percentStatus: (task.percentStatus! += 10),
          },
        });
      } else if (metalliStatus === false && task.metalli === true) {
        console.log("removing metalli");
        // Removing 25% only if it was added before
        response = await prisma.task.update({
          where: { id },
          data: {
            metalli: metalliStatus,
            percentStatus: (task.percentStatus! -= 10),
          },
        });
      } else {
        console.log("no change in ferramenta");
        // No change in percentStatus
        response = await prisma.task.update({
          where: { id },
          data: {
            metalli: metalliStatus,
          },
        });
      }

      if (response) {
        // console.log(response);
        // Create a new Action record to track the user action
        const newAction = await prisma.action.create({
          data: {
            type: "updated_task",
            data: {
              taskId: id,
              metalli: response.metalli,
            },
            User: {
              connect: {
                authId: userId,
              },
            },
            Task: {
              connect: {
                id: id,
              },
            },
          },
        });

        return NextResponse.json({
          data: response,
          history: newAction,
          status: 200,
        });
      }
    }
  } catch (err) {
    // console.log(err);
    return NextResponse.json({ err, status: 400 });
  }
}
