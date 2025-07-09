import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const filteredKanban = params.slug;
  try {
    const kanban = await prisma.kanban.findUnique({
      where: {
        //@ts-ignore
        identifier: filteredKanban,
      },
      include: {
        columns: true,
      },
    });
    return NextResponse.json(kanban);
  } catch (error) {
    return NextResponse.json({ error: error });
  }
}
