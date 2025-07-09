import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";

export const GET = async () => {
  try {
    const users = await prisma.roles.findMany();

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
