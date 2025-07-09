import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
import { QC_Status } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = params.id;
  const body = await req.json();
  const todayDate = new Date();
  try {
    // Transactional update for each item
    const updateResults = await prisma.$transaction(
      body.items.map((item: { id: number; checked: boolean }) => {
        return prisma.qc_item.update({
          where: {
            id: item.id, // Use the id from each item
          },
          data: {
            checked: item.checked, // Update check
            updated_at: todayDate, // Update date
          },
        });
      })
    );

    // After updating items, check if all related packing items are completed
    for (const { id } of body.items) {
      const relatedPackingControl = await prisma.qc_item.findUnique({
        where: { id },
        select: { qualityControlId: true }, // Assuming packingItem has a relation with packingControl
      });

      if (relatedPackingControl) {
        const items = await prisma.qc_item.findMany({
          where: { qualityControlId: relatedPackingControl.qualityControlId },
        });

        const totalItems = items.length;
        const filledItems = items.filter(
          (item) => item.checked !== false
        ).length;

        // SET IF ALL THE ITEMS ARE COMPLETED
        // let status: QC_Status = QC_Status.NOT_DONE; // Default status
        // if (filledItems === totalItems) {
        //   status = QC_Status.DONE; // All items are filled
        // } else if (filledItems > 0) {
        //   status = QC_Status.PARTIALLY_DONE; // Some items are filled
        // }

        // SET IF SOME ITEMS ARE COMPLETED
        let status: QC_Status = QC_Status.NOT_DONE; // Default status
        if (filledItems >= 1) {
          status = QC_Status.DONE; // All items are filled
        } else if (filledItems > 0) {
          status = QC_Status.PARTIALLY_DONE; // Some items are filled
        }

        // Update packingControl status
        await prisma.qualityControl.update({
          where: { id: relatedPackingControl.qualityControlId! },
          data: {
            passed: status,
            user: { connect: { authId: body.user } },
            updated_at: todayDate,
          },
        });
      }
    }
    return NextResponse.json({ updateResults, status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error, status: 500 });
  }
}
