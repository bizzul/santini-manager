import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { fetchClientManagerSummary } from "@/lib/client-manager-summary";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const { clientId } = await params;
  const parsedClientId = Number(clientId);

  if (!Number.isInteger(parsedClientId)) {
    return NextResponse.json(
      { error: "Cliente non valido" },
      { status: 400 },
    );
  }

  try {
    const summary = await fetchClientManagerSummary(
      siteContext.siteId,
      parsedClientId,
    );

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Errore nel riepilogo cliente" },
      { status: 500 },
    );
  }
}
