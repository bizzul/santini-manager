import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma-global";
import { getSession } from "@auth0/nextjs-auth0";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json();
  const { id, altroStatus } = body;
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
      if (altroStatus === true && task.altro === false) {
        response = await prisma.task.update({
          where: { id },
          data: {
            altro: altroStatus,
            percentStatus: (task.percentStatus! += 15),
          },
        });
      } else if (altroStatus === false && task.altro === true) {
        response = await prisma.task.update({
          where: { id },
          data: {
            altro: altroStatus,
            percentStatus: (task.percentStatus! -= 15),
          },
        });
      } else {
        response = await prisma.task.update({
          where: { id },
          data: {
            altro: altroStatus,
          },
        });
      }
      if (response) {
        const newAction = await prisma.action.create({
          data: {
            type: "updated_task",
            data: {
              taskId: id,
              altro: response.altro,
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
