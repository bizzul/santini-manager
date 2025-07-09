import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma-global";
import { getSession } from "@auth0/nextjs-auth0";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json();
  const { id, legnoStatus } = body;
  let userId = null;
  if (session) {
    userId = session.user.sub;
  }
  try {
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (task) {
      let response;
      if (legnoStatus === true && task.legno === false) {
        response = await prisma.task.update({
          where: { id },
          data: {
            legno: legnoStatus,
            percentStatus: (task.percentStatus! += 15),
          },
        });
      } else if (legnoStatus === false && task.legno === true) {
        response = await prisma.task.update({
          where: { id },
          data: {
            legno: legnoStatus,
            percentStatus: (task.percentStatus! -= 15),
          },
        });
      } else {
        response = await prisma.task.update({
          where: { id },
          data: {
            legno: legnoStatus,
          },
        });
      }
      if (response) {
        const newAction = await prisma.action.create({
          data: {
            type: "updated_task",
            data: {
              taskId: id,
              legno: response.legno,
            },
            User: {
              connect: { authId: userId },
            },
            Task: {
              connect: { id: id },
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
    return NextResponse.json({ err, status: 400 });
  }
}
