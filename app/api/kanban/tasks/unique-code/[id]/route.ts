// pages/api/protected-route.js
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../../../../prisma-global";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  try {
    // Fetch a single client
    const client = await prisma.task.findUnique({
      where: {
        unique_code: taskId,
      },
      include: {
        kanban: true,
        client: true,
        User: true,
        column: true,
        sellProduct: true,
      },
    });
    // console.log("project", client);
    if (client) {
      return NextResponse.json({ client, status: 200 });
    } else {
      return NextResponse.json({ message: "Client not found", status: 404 });
    }
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}
