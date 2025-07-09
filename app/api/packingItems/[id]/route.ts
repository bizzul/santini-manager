import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
import { QC_Status } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = params.id;
  const body = await req.json();
  try {
    // Transactional update for each item
    const updateResults = await prisma.$transaction(
      body.items.map((item: { id: number; pacchi: number; numero: number }) => {
        return prisma.packingItem.update({
          where: {
            id: item.id, // Use the id from each item
          },
          data: {
            number: item.numero, // Update numero
            package_quantity: item.pacchi,
          },
        });
      })
    );

    // After updating items, check if all related packing items are completed
    for (const { id } of body.items) {
      const relatedPackingControl = await prisma.packingItem.findUnique({
        where: { id },
        select: { packingControlId: true }, // Assuming packingItem has a relation with packingControl
      });

      if (relatedPackingControl) {
        const items = await prisma.packingItem.findMany({
          where: { packingControlId: relatedPackingControl.packingControlId },
        });

        const totalItems = items.length;
        const filledItems = items.filter(
          (item) => item.number !== null && item.package_quantity !== null
        ).length;

        let status: QC_Status = QC_Status.NOT_DONE; // Default status
        if (filledItems === totalItems) {
          status = QC_Status.DONE; // All items are filled
        } else if (filledItems > 0) {
          status = QC_Status.PARTIALLY_DONE; // Some items are filled
        }

        // Update packingControl status
        await prisma.packingControl.update({
          where: { id: relatedPackingControl.packingControlId },
          data: { passed: status, user: { connect: { authId: body.user } } },
        });
      }
    }
    return NextResponse.json({ updateResults, status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error, status: 500 });
  }
}
