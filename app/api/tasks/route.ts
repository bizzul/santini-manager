import { NextResponse } from "next/server";
import { prisma } from "../../../prisma-global";

export const GET = async () => {
  try {
    const tasks = await prisma.task.findMany();

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
