import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { fetchClientManagerSummary } from "@/lib/client-manager-summary";
import { formatSwissCurrency } from "@/lib/project-consuntivo";
import { createServiceClient } from "@/utils/supabase/server";
import { createTabularReportResponse } from "@/lib/tabular-report-export";

export const dynamic = "force-dynamic";

type ClientDetailRow = {
  Campo: string;
  Valore: string;
};

function getClientName(client: any) {
  return (
    client.businessName ||
    `${client.individualLastName || ""} ${client.individualFirstName || ""}`.trim() ||
    "Cliente"
  );
}

function buildMetricValue(count: number, totalValue: number) {
  const label = count === 1 ? "elemento" : "elementi";
  return `${count} ${label} | ${formatSwissCurrency(totalValue, 2, 2)}`;
}

export async function POST(req: NextRequest) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const clientId = Number(payload?.clientId);
  const format = payload?.format === "pdf" ? "pdf" : "excel";

  if (!Number.isInteger(clientId)) {
    return NextResponse.json(
      { error: "Cliente non valido" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: client, error } =
    await supabase
      .from("Client")
      .select("*")
      .eq("site_id", siteContext.siteId)
      .eq("id", clientId)
      .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const commercialSummary = await fetchClientManagerSummary(
    siteContext.siteId,
    clientId,
  ).catch((summaryError) => {
    return NextResponse.json(
      { error: summaryError.message || "Errore riepilogo cliente" },
      { status: 500 },
    );
  });

  if (commercialSummary instanceof NextResponse) {
    return commercialSummary;
  }

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  const contactPeople = Array.isArray(client.contactPeople)
    ? client.contactPeople
        .map((contact: any) =>
          [contact?.name, contact?.role, contact?.email, contact?.phone]
            .filter(Boolean)
            .join(" - "),
        )
        .filter(Boolean)
        .join("; ")
    : "-";

  const rows: ClientDetailRow[] = [
    { Campo: "Nome cliente", Valore: getClientName(client) },
    { Campo: "Tipologia", Valore: client.clientType || "-" },
    { Campo: "Titolo", Valore: client.individualTitle || "-" },
    { Campo: "Lingua", Valore: client.clientLanguage || "-" },
    { Campo: "Indirizzo", Valore: client.address || "-" },
    { Campo: "CAP", Valore: client.zipCode ? String(client.zipCode) : "-" },
    { Campo: "Citta", Valore: client.city || "-" },
    { Campo: "Nazione", Valore: client.countryCode || "-" },
    { Campo: "Telefono fisso", Valore: client.landlinePhone || "-" },
    { Campo: "Cellulare", Valore: client.mobilePhone || "-" },
    { Campo: "Email", Valore: client.email || "-" },
    { Campo: "Referenti", Valore: contactPeople || "-" },
    { Campo: "Creato il", Valore: client.created_at ? new Date(client.created_at).toLocaleString("it-IT") : "-" },
    { Campo: "Offerte inviate", Valore: buildMetricValue(commercialSummary.offersSent.count, commercialSummary.offersSent.totalValue) },
    { Campo: "Offerte vinte", Valore: buildMetricValue(commercialSummary.offersWon.count, commercialSummary.offersWon.totalValue) },
    { Campo: "Offerte perse", Valore: buildMetricValue(commercialSummary.offersLost.count, commercialSummary.offersLost.totalValue) },
    { Campo: "Progetti in corso", Valore: buildMetricValue(commercialSummary.projectsInProgress.count, commercialSummary.projectsInProgress.totalValue) },
    { Campo: "Progetti ultimati", Valore: buildMetricValue(commercialSummary.projectsCompleted.count, commercialSummary.projectsCompleted.totalValue) },
  ];

  return createTabularReportResponse({
    title: "Scheda cliente",
    subtitle: `Anagrafica completa cliente - ${getClientName(client)}`,
    sheetName: "Cliente",
    filenameBase: `report-cliente-${client.id}`,
    format,
    rows,
    columns: [
      { key: "Campo", header: "Campo", width: 24, pdfWidth: 150 },
      { key: "Valore", header: "Valore", width: 50, pdfWidth: 365 },
    ],
    metaLines: [`Cliente ID: ${client.id}`],
    siteName: siteContext.siteData?.name,
    logoUrl: siteContext.siteData?.logo,
    documentCode: `CLIENTE-${client.id}`,
  });
}
