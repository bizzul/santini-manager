import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";
import { createTabularReportResponse } from "@/lib/tabular-report-export";

export const dynamic = "force-dynamic";

type SupplierExportRow = {
  Fornitore: string;
  Categoria: string;
  Contatto: string;
  Email: string;
  Telefono: string;
  Localita: string;
};

export async function POST(req: NextRequest) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const format = payload?.format === "pdf" ? "pdf" : "excel";
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("Supplier")
    .select("*, supplier_category:supplier_category_id(id, name)")
    .eq("site_id", siteContext.siteId)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: SupplierExportRow[] = (data || []).map((supplier: any) => ({
    Fornitore: supplier.name || "-",
    Categoria: supplier.supplier_category?.name || "-",
    Contatto: supplier.contact || "-",
    Email: supplier.email || "-",
    Telefono: supplier.phone || "-",
    Localita: supplier.location || "-",
  }));

  return createTabularReportResponse({
    title: "Report fornitori",
    subtitle: "Elenco completo fornitori del sito corrente",
    sheetName: "Fornitori",
    filenameBase: "report-fornitori",
    format,
    rows,
    columns: [
      { key: "Fornitore", header: "Fornitore", width: 24, pdfWidth: 120 },
      { key: "Categoria", header: "Categoria", width: 20, pdfWidth: 78 },
      { key: "Contatto", header: "Contatto", width: 18, pdfWidth: 90 },
      { key: "Email", header: "Email", width: 24, pdfWidth: 118 },
      { key: "Telefono", header: "Telefono", width: 16, pdfWidth: 72 },
      { key: "Localita", header: "Localita", width: 18, pdfWidth: 78 },
    ],
    metaLines: [`Fornitori esportati: ${rows.length}`],
    siteName: siteContext.siteData?.name,
    logoUrl: siteContext.siteData?.logo,
    documentCode: "FORNITORI",
  });
}
