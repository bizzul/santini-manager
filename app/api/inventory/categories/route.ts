import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";

export const GET = async () => {
  try {
    const categories = await prisma.product_category.findMany();

    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
