import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const result = await prisma.file.create({
      data: {
        name: body.original_filename,
        url: body.secure_url,
        cloudinaryId: body.asset_id,
      },
    });
    // // Success
    if (result) {
      return NextResponse.json({ result, status: 200 });
    }
  } catch (error) {
    //Input invalid
    return NextResponse.json({ error, status: 400 });
  }
}
