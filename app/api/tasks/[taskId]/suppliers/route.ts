import { prisma } from "../../../../../prisma-global";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskSuppliers = await prisma.taskSupplier.findMany({
      where: { taskId: parseInt(params.taskId) },
      include: { supplier: true },
    });

    return NextResponse.json(taskSuppliers);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching task suppliers", message: error },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { supplierId, deliveryDate } = await request.json();

    const existingSupplier = await prisma.taskSupplier.findUnique({
      where: {
        taskId_supplierId: {
          taskId: parseInt(params.taskId),
          supplierId: supplierId,
        },
      },
    });

    if (existingSupplier) {
      const updatedSupplier = await prisma.taskSupplier.update({
        where: {
          id: existingSupplier.id,
        },
        data: {
          deliveryDate: new Date(deliveryDate),
        },
        include: { supplier: true },
      });
      return NextResponse.json(updatedSupplier);
    }

    const taskSupplier = await prisma.taskSupplier.create({
      data: {
        taskId: parseInt(params.taskId),
        supplierId,
        deliveryDate: new Date(deliveryDate),
      },
      include: { supplier: true },
    });

    return NextResponse.json(taskSupplier);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error managing task supplier" },
      { status: 500 }
    );
  }
}
