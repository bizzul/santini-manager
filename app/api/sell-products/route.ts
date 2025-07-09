import { NextResponse } from "next/server";
import { prisma } from "../../../prisma-global";

export const GET = async () => {
  try {
    const data = await prisma.sellProduct.findMany();

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
