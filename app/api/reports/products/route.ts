import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";
import { createTabularReportResponse } from "@/lib/tabular-report-export";

export const dynamic = "force-dynamic";

type ProductExportRow = {
  Nome: string;
  Categoria: string;
  Tipologia: string;
  Descrizione: string;
  "Listino prezzi": string;
  "Url immagine": string;
  "Url documento": string;
  Attivo: string;
};

export async function GET(req: NextRequest) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("SellProduct")
    .select(`
      *,
      category:category_id(id, name)
    `)
    .eq("site_id", siteContext.siteId)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: ProductExportRow[] = (data || []).map((product: any) => ({
    Nome: product.name || "-",
    Categoria: product.category?.name || "-",
    Tipologia: product.type || "-",
    Descrizione: product.description || "-",
    "Listino prezzi": product.price_list || "-",
    "Url immagine": product.image_url || "-",
    "Url documento": product.doc_url || "-",
    Attivo: product.active ? "Si" : "No",
  }));

  return createTabularReportResponse({
    title: "Report prodotti",
    subtitle: "Anagrafica completa dei prodotti del sito",
    sheetName: "Prodotti",
    filenameBase: "report-prodotti",
    rows,
    columns: [
      { key: "Nome", header: "Nome", width: 24 },
      { key: "Categoria", header: "Categoria", width: 20 },
      { key: "Tipologia", header: "Tipologia", width: 18 },
      { key: "Descrizione", header: "Descrizione", width: 36 },
      { key: "Listino prezzi", header: "Listino prezzi", width: 20 },
      { key: "Url immagine", header: "Url immagine", width: 32 },
      { key: "Url documento", header: "Url documento", width: 32 },
      { key: "Attivo", header: "Attivo", width: 10 },
    ],
    metaLines: [`Prodotti esportati: ${rows.length}`],
  });
}
