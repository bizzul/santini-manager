// pages/api/protected-route.js
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { validation } from "../../../../validation/errorTracking/create"; //? <--- The validation schema
import { prisma } from "../../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = validation.safeParse(body); //? <---Veryfing body against validation schema
  if (data.success) {
    const result = await prisma.errortracking.create({
      data: {
        description: data.data.description ?? "",
        error_category: data.data.errorCategory,
        error_type: data.data.errorType ?? "",
        supplier: data.data.supplier
          ? { connect: { id: Number(data.data.supplier) } }
          : undefined,
        position: data.data.position,
        task: { connect: { id: Number(data.data.task) } },
        user: { connect: { authId: data.data.user } },
      },
    });
    // // Success
    if (result) {
      if (body.fileIds !== null) {
        // Save the Cloudinary IDs of the uploaded files to the task record
        await Promise.all(
          body.fileIds.map((fileId: number) => {
            return prisma.file.update({
              where: { id: fileId },
              data: {
                errortrackingId: result.id,
              },
            });
          })
        );
      }

      // Create a new Action record to track the user action
      const newAction = await prisma.action.create({
        data: {
          type: "errortracking_create",
          data: {
            errorTracking: result.id,
          },
          User: {
            connect: {
              authId: body.user,
            },
          },
        },
      });
      if (newAction) {
        return NextResponse.json({ data, status: 200 });
      }
    } else {
      return NextResponse.json({ error: result, status: 500 });
    }
  } else {
    //Input invalid
    return NextResponse.json({ error: data.error, status: 400 });
  }
}
