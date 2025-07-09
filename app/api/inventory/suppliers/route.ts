import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";

export const GET = async () => {
  try {
    const suppliers = await prisma.supplier.findMany();

    return NextResponse.json(suppliers);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
