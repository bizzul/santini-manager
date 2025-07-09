import { prisma } from "../../../../../../prisma-global";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string; supplierId: string } }
) {
  try {
    const taskSupplier = await prisma.taskSupplier.delete({
      where: {
        taskId_supplierId: {
          taskId: parseInt(params.taskId),
          supplierId: parseInt(params.supplierId),
        },
      },
    });

    return NextResponse.json(taskSupplier);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error deleting task supplier" },
      { status: 500 }
    );
  }
}
