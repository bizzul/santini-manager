import { prisma } from "../../../prisma-global";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Prima otteniamo tutti i fornitori
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        name: "asc", // Ordiniamo solo per nome
      },
    });

    // Poi riordiniamo manualmente mettendo i default prima
    const orderedSuppliers = suppliers.sort((a, b) => {
      // Se uno è default e l'altro no, il default va prima
      if (a.name === "GU" || a.name === "GUTMANN" || a.name === "MEAS") {
        return -1;
      }
      if (b.name === "GU" || b.name === "GUTMANN" || b.name === "MEAS") {
        return 1;
      }
      // Altrimenti manteniamo l'ordine alfabetico
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(orderedSuppliers);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching suppliers" },
      { status: 500 }
    );
  }
}
