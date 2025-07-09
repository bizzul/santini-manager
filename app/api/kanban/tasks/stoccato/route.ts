import { prisma } from "../../../../../prisma-global";
import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";

export async function POST(request: Request) {
  const session = await getSession();
  let userId: string = "";
  if (session) {
    userId = session.user.sub;
  }

  try {
    const body = await request.json();
    const { id, stoccatoStatus, stoccatoDate } = body;

    const updatedTask = await prisma.task.update({
      where: {
        id: id,
      },
      data: {
        stoccato: stoccatoStatus,
        stoccaggiodate: stoccatoDate ? new Date(stoccatoDate) : null,
      },
    });

    await prisma.action.create({
      data: {
        type: "updated_task",
        data: {
          taskId: id,
          stoccato: stoccatoStatus,
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

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error("Error updating stoccato status:", error);
    return NextResponse.json(
      { error: "Failed to update stoccato status" },
      { status: 500 }
    );
  }
}
