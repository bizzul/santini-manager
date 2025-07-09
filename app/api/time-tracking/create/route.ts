import { validation } from "../../../../validation/timeTracking/create";
import { prisma } from "../../../../prisma-global";
import { NextRequest, NextResponse } from "next/server";
import { Action, Prisma, Timetracking } from "@prisma/client";

// Helper function to calculate total hours
function calculateTotalHours(hours: number, minutes: number): number {
  const totalTimeInHours = hours + minutes / 60;
  return parseFloat(totalTimeInHours.toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request data
    const data = await req.json().catch(() => {
      throw new Error("Invalid JSON payload");
    });

    const dataArray = validation.safeParse(data);
    if (!dataArray.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: dataArray.error.format(),
          status: 400,
        },
        { status: 400 }
      );
    }

    const timetrackings = dataArray.data;
    const results: { timetracking: Timetracking; action: Action }[] = [];

    // Use a transaction to ensure all operations succeed or none do
    await prisma.$transaction(async (tx) => {
      for (const data of timetrackings) {
        const roundedTotalTime = calculateTotalHours(data.hours, data.minutes);
        const useCNC = data.roles.id === 2;

        const timetrackingData = {
          description: data.description,
          description_type: data.descriptionCat,
          hours: data.hours,
          minutes: data.minutes,
          totalTime: roundedTotalTime,
          use_cnc: useCNC,
          roles: { connect: { id: data.roles.id } },
          task: { connect: { unique_code: data.task } },
          user: { connect: { authId: data.userId } },
        };

        // Create timetracking entry
        const timetracking = await tx.timetracking.create({
          data: timetrackingData,
        });

        // Create action record
        const action = await tx.action.create({
          data: {
            type: "timetracking_create",
            data: {
              timetracking: timetracking.id,
            },
            User: {
              connect: {
                authId: data.userId,
              },
            },
          },
        });

        results.push({ timetracking, action });
      }
    });

    return NextResponse.json(
      {
        message: "Data successfully saved",
        results,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in time-tracking creation:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      switch (error.code) {
        case "P2002":
          return NextResponse.json(
            {
              error: "Unique constraint violation",
              details: error.message,
              status: 409,
            },
            { status: 409 }
          );
        case "P2025":
          return NextResponse.json(
            {
              error: "Record not found",
              details: error.message,
              status: 404,
            },
            { status: 404 }
          );
        default:
          return NextResponse.json(
            {
              error: "Database error",
              details: error.message,
              status: 500,
            },
            { status: 500 }
          );
      }
    }

    // Handle other types of errors
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
      { status: 500 }
    );
  }
}
