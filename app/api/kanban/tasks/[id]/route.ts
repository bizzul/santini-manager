import { prisma } from "../../../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: number } }
) {
  const taskId = params.id;
  try {
    // Fetch a single client
    const task = await prisma.task.findUnique({
      where: {
        id: Number(taskId),
      },
      include: {
        kanban: true,
        client: true,
        User: true,
        column: true,
        files: true,
        sellProduct: true,
      },
    });
    // console.log("project", client);
    if (task) {
      return NextResponse.json({ task, status: 200 });
    } else {
      return NextResponse.json({ message: "Client not found", status: 404 });
    }
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const taskId = await req.json();
  //Fetch a single client address
  // console.log(req.body);
  const task = await prisma.task.findUnique({
    where: {
      id: Number(taskId),
    },
  });

  if (task) {
    const taskData = await prisma.task.update({
      where: {
        id: Number(taskId),
      },
      data: {},
    });

    return NextResponse.json({ stato: "UPDATED", task: taskData, status: 200 });
  }
  return NextResponse.json({ message: "The product not exist.", status: 404 });
}

export async function DELETE(req: NextRequest) {
  const productId = await req.json();
  const product = await prisma.product.findUnique({
    where: {
      id: Number(productId),
    },
  });

  if (product) {
    //Removing client
    await prisma.product.delete({
      where: {
        id: Number(productId),
      },
    });

    return NextResponse.json({
      stato: "DELETED",
      product: product,
      status: 200,
    });
  }

  return NextResponse.json({
    message: "The product id not exist.",
    status: 404,
  });
}
