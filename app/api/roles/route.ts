import { NextResponse } from "next/server";
import { prisma } from "../../../prisma-global";

export const GET = async () => {
  try {
    const roles = await prisma.roles.findMany();

    return NextResponse.json(roles);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
