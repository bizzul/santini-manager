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

function getCategoryName(product: any) {
  const category = Array.isArray(product.category)
    ? product.category[0]
    : product.category;
  return category?.name || "-";
}

async function buildProductsReport(
  req: NextRequest,
  categoryIds: number[],
  subcategories: string[],
) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  let query = supabase
    .from("SellProduct")
    .select(`
      *,
      category:category_id(id, name)
    `)
    .eq("site_id", siteContext.siteId)
    .order("name", { ascending: true });

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filteredProducts = (data || []).filter((product: any) => {
    if (categoryIds.length > 0 && !categoryIds.includes(Number(product.category_id))) {
      return false;
    }

    if (subcategories.length > 0 && !subcategories.includes(product.type || "")) {
      return false;
    }

    return true;
  });

  const rows: ProductExportRow[] = filteredProducts.map((product: any) => ({
    Nome: product.name || "-",
    Categoria: getCategoryName(product),
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
    metaLines: [
      `Categorie selezionate: ${categoryIds.length > 0 ? categoryIds.length : "tutte"}`,
      `Sottocategorie selezionate: ${subcategories.length > 0 ? subcategories.length : "tutte"}`,
      `Prodotti esportati: ${rows.length}`,
    ],
  });
}

export async function GET(req: NextRequest) {
  return buildProductsReport(req, [], []);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const categoryIds = Array.isArray(payload?.categoryIds)
    ? payload.categoryIds
        .map((categoryId: unknown) => Number(categoryId))
        .filter((categoryId: number) => Number.isInteger(categoryId))
    : [];
  const subcategories = Array.isArray(payload?.subcategories)
    ? payload.subcategories
        .map((subcategory: unknown) => String(subcategory).trim())
        .filter((subcategory: string) => subcategory.length > 0)
    : [];

  return buildProductsReport(req, categoryIds, subcategories);
}
